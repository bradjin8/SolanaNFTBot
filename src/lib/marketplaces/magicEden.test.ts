import magicEden from "./magicEden";
import magicEdenSaleTx from "./__fixtures__/magicEdenSaleTx";
import magicEdenSaleFromBidTx from "./__fixtures__/magicEdenSaleFromBidTx";
import { SaleMethod } from "./types";
import { Connection } from "@solana/web3.js";

jest.mock("lib/solana/NFTData", () => {
  return {
    fetchNFTData: () => {
      return {};
    },
  };
});

describe("magicEden", () => {
  const conn = new Connection("https://test/");

  test("itemUrl", () => {
    expect(magicEden.itemURL("xxx1")).toEqual(
      "https://magiceden.io/item-details/xxx1"
    );
  });

  describe("parseNFTSale", () => {
    test("sale transaction should return NFTSale", async () => {
      const sale = await magicEden.parseNFTSale(conn, magicEdenSaleTx);
      expect(sale.transaction).toEqual(
        "626EgwuS6dbUKrkZujQCFjHiRsz92ALR5gNAEg2eMpZzEo88Cci6HifpDFcvgYR8j88nXUq1nRUA7UDRdvB7Y6WD"
      );
      expect(sale.token).toEqual(
        "8pwYVy61QiSTJGPc8yYfkVPLBBr8r17WkpUFRhNK6cjK"
      );
      expect(sale.soldAt).toEqual(new Date(1635141315000));
      expect(sale.marketplace).toEqual(magicEden);
      expect(sale.getPriceInLamport()).toEqual(3720000000);
      expect(sale.getPriceInSOL()).toEqual(3.72);

      const expectedTransfers = [
        {
          to: "2NZukH2TXpcuZP4htiuT8CFxcaQSWzkkR6kepSWnZ24Q",
          from: "U7ZkJtaAwvBHt9Tw5BK8sdp2wLrEe7p1g3kFxB9WJCu",
          revenue: {
            amount: 74400000,
            symbol: "lamport",
          },
        },
        {
          to: "4eQwMqAA4c2VUD51rqfAke7kqeFLAxcxSB67rtFjDyZA",
          from: "U7ZkJtaAwvBHt9Tw5BK8sdp2wLrEe7p1g3kFxB9WJCu",
          revenue: {
            amount: 74400000,
            symbol: "lamport",
          },
        },
        {
          to: "Dz9kwoBVVzF11cHeKotQpA7t4aeCQsgRpVw4dg8zkntg",
          from: "U7ZkJtaAwvBHt9Tw5BK8sdp2wLrEe7p1g3kFxB9WJCu",
          revenue: {
            amount: 74400000,
            symbol: "lamport",
          },
        },
        {
          to: "4xHEEswq2T2E5uNoa1uw34RNKzPerayBHxX3P4SaR7cD",
          from: "U7ZkJtaAwvBHt9Tw5BK8sdp2wLrEe7p1g3kFxB9WJCu",
          revenue: {
            amount: 74400000,
            symbol: "lamport",
          },
        },
        {
          to: "33CJriD17bUScYW7eKFjM6BPfkFWPerHfdpvtw3a8JdN",
          from: "U7ZkJtaAwvBHt9Tw5BK8sdp2wLrEe7p1g3kFxB9WJCu",
          revenue: {
            amount: 74400000,
            symbol: "lamport",
          },
        },
        {
          to: "HWZybKNqMa93EmHK2ESL2v1XShcnt4ma4nFf14497jNS",
          from: "U7ZkJtaAwvBHt9Tw5BK8sdp2wLrEe7p1g3kFxB9WJCu",
          revenue: {
            amount: 74400000,
            symbol: "lamport",
          },
        },
        {
          to: "HihC794BdNCetkizxdFjVD2KiKWirGYbm2ojvRYXQd6H",
          from: "U7ZkJtaAwvBHt9Tw5BK8sdp2wLrEe7p1g3kFxB9WJCu",
          revenue: {
            amount: 3273600000,
            symbol: "lamport",
          },
        },
      ];
      expect(sale.transfers.length).toEqual(expectedTransfers.length);
      expectedTransfers.forEach((expectedTransfer, index) => {
        const transfer = sale.transfers[index];
        expect(transfer.from).toEqual(expectedTransfer.from);
        expect(transfer.to).toEqual(expectedTransfer.to);
        expect(transfer.revenue).toEqual(expectedTransfer.revenue);
      });
      expect(sale.method).toEqual(SaleMethod.Direct);
      expect(sale.seller).toEqual(
        "HihC794BdNCetkizxdFjVD2KiKWirGYbm2ojvRYXQd6H"
      );
    });
    test("bidding sale transaction should return NFTSale", async () => {
      const sale = await magicEden.parseNFTSale(conn, magicEdenSaleFromBidTx);
      expect(sale.transaction).toEqual(
        "1cSgCBgot6w4KevVvsZc2PiST16BsEh9KAvmnbsSC9xXvput4SXLoq5pneQfczQEBw3jjcdmupG7Gp6MjG5MLzy"
      );
      expect(sale.token).toEqual(
        "3SxS8hpvZ6BfHXwaURJAhtxXWbwnkUGA7HPV3b7uLnjN"
      );
      expect(sale.buyer).toEqual(
        "2fT7A7iKwDodPj5rm4u4tXRFny9JY1ttHhHGp1PsvsAn"
      );
      expect(sale.method).toEqual(SaleMethod.Bid);
      expect(sale.seller).toEqual(
        "AJ3r8njrEnHnwmv2JmnXEYoy7EfsxWQq7UcnLUhjuVab"
      );
    });
    test("non-sale transaction should return null", async () => {
      const invalidSaleTx = {
        ...magicEdenSaleTx,
        meta: {
          ...magicEdenSaleTx.meta,
          preTokenBalances: [],
          postTokenBalances: [],
        },
      };
      expect(await magicEden.parseNFTSale(conn, invalidSaleTx)).toBe(null);
    });
    test("non magic eden transaction", async () => {
      const nonMagicEdenSaleTx = {
        ...magicEdenSaleTx,
      };
      nonMagicEdenSaleTx.meta.logMessages = ["Program xxx invoke [1]"];
      expect(await magicEden.parseNFTSale(conn, nonMagicEdenSaleTx)).toBe(null);
    });
  });
});
