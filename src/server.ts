import express from "express";
import {initClient as initDiscordClient,} from "lib/discord";
import initWorkers from "workers/initWorkers";
import {newConnection} from "lib/solana/connection";
import dotenv from "dotenv";
import notifyDiscordSale, {getStatus} from "lib/discord/notifyDiscordSale";
import {loadConfig} from "config";
import {Worker} from "workers/types";
import notifyNFTSalesWorker from "workers/notifyNFTSalesWorker";
import {Marketplace, NFTSale, parseNFTSale, SaleMethod, Transfer} from "lib/marketplaces";
import {LAMPORTS_PER_SOL, ParsedConfirmedTransaction} from "@solana/web3.js";
import notifyTwitter from "lib/twitter/notifyTwitter";
import logger from "lib/logger";
import {newNotifierFactory, NotificationType} from "lib/notifier";
import initTwitterClient from "lib/twitter";
import queue from "queue";
import NFTData from "./lib/solana/NFTData";
import {parseNFTSaleOnTx} from "./lib/marketplaces/helper";
import {Creator} from "@metaplex/js";

const testhook = "https://discord.com/api/webhooks/953907798134095912/WC0Z6ERStfbR31W_v2Y9OggqzZSVXKf9iEVdw1QUnyrthCU5mV2hgWyRZ_GUTGHTOBwW";

(async () => {
  try {
    const result = dotenv.config();
    if (result.error) {
      throw result.error;
    }
    const config = loadConfig();
    const port = process.env.PORT || 4000;

    const web3Conn = newConnection();

    const nQueue = queue({
      concurrency: config.queueConcurrency,
      autostart: true,
    });

    const notifierFactory = await newNotifierFactory(config, nQueue);

    const server = express();
    server.get("/test", (req, res) => {
      const nftSale = {
        transaction: "4qHxEKmkXXPKG35nwVKqfkA1sW4Y4sNaBeQsMdRcczy1fHZjnsKsfnKCDJoJUzHbkt9gTS8e7FQPtfHybz7GCSNT",
        buyer: "5dppRsk3yQgWAeS2e6RjJXoqbJJ7c77CSJJ9S5FCmgtt",
        seller: "2yhCNJtsD8vDFPKLF3aqKEs5YN73FPAnnhJ2ov2gDehe",
        method: "Sale",
        token: "6S3T5dpPhn5gDQ2cCjttJ71x77F1i2DjBPuxsUwwGavo",
        transfers: [],
        soldAt: Date.now(),
        marketplace: {
          name: "Magic Eden",
          programId: [
            "MEisE1HzehtrDpAAT8PnLHjpSSkRYakotTuJRPjTpo8",
            "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K",
          ],
          iconURL: "https://www.magiceden.io/img/favicon.png",
          itemURL: (token: String) => `https://magiceden.io/item-details/${token}`,
          parseNFTSale(web3Conn: any, txResp: any): Promise<NFTSale | null> {
            return parseNFTSaleOnTx(web3Conn, txResp, this, 0);
          },
        },
        nftData: {
          name: "Raccoonverse #134",
          symbol: "Raccoonverse",
          image: "https://cdn.magiceden.io/rs:fill:640:640:0:0/plain/https://monkelabs.nyc3.digitaloceanspaces.com/raccoonverse/images/60dec19655935703851207ad961e2e8b.png",
          sellerFeeBasisPoints: 750,
          creators: []
        },
        getPriceInLamport: () => 1.5 * LAMPORTS_PER_SOL,
        getPriceInSOL: () => 1.5
      }
      notifierFactory.create({
        mintAddress: 'D4dUtkktkGFe9cgiZ4P9p851oeWPUxeyhkJNF2WkKUge',
        discordChannelId: '953547142360862741'
      }).notify(NotificationType.Sale, nftSale)

      res.send(`NFT Sales parsed: \n${JSON.stringify(nftSale)}`);
    })

    server.get("/", (req, res) => {
      const {totalNotified, lastNotified} = getStatus();
      res.send(`
      ${config.subscriptions.map(
        (s) =>
          `Watching the address ${s.mintAddress} at discord channel #${s.discordChannelId} for NFT sales.<br/>`
      )}
      Total notifications sent: ${totalNotified}<br/>
      ${
        lastNotified
          ? `Last notified at: ${lastNotified.toISOString()}<br/>`
          : ""
      }
      ${`Current UTC time: ${new Date().toISOString()}`}
      `);
    });

    server.get("/test-sale-tx", async (req, res) => {
      const signature = (req.query["signature"] as string) || "";
      if (!signature) {
        res.send(`no signature in query param`);
        return;
      }

      let tx: ParsedConfirmedTransaction | null = null;
      try {
        tx = await web3Conn.getParsedConfirmedTransaction(signature);
      } catch (e) {
        logger.log(e);
        res.send(`Get transaction failed, check logs for error.`);
        return;
      }
      if (!tx) {
        res.send(`No transaction found for ${signature}`);
        return;
      }
      const nftSale = await parseNFTSale(web3Conn, tx);
      if (!nftSale) {
        res.send(
          `No NFT Sale detected for tx: ${signature}\n${JSON.stringify(tx)}`
        );
        return;
      }
      if (config.discordBotToken) {
        const discordClient = await initDiscordClient(config.discordBotToken);
        if (discordClient) {
          const channelId = (req.query["channelId"] as string) || "";
          await notifyDiscordSale(discordClient, channelId, nftSale);
        }
      }

      const twitterClient = await initTwitterClient(config.twitter);
      const sendTweet = (req.query["tweet"] as string) || "";
      if (sendTweet && twitterClient) {
        await notifyTwitter(twitterClient, nftSale).catch((err) => {
          logger.error("Error occurred when notifying twitter", err);
        });
      }

      res.send(`NFT Sales parsed: \n${JSON.stringify(nftSale)}`);
    });

    server.listen(port, (err?: any) => {
      if (err) throw err;
      logger.log(`Ready on http://localhost:${port}`);
    });

    const workers: Worker[] = config.subscriptions.map((s) => {
      const project = {
        discordChannelId: s.discordChannelId,
        mintAddress: s.mintAddress,
      };
      const notifier = notifierFactory.create(project);
      return notifyNFTSalesWorker(notifier, web3Conn, project);
    });

    const _ = initWorkers(workers);
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
})();
