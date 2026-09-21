import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@nicecxone/lyra-ui";

/* ── MarcusWebbTransactionsTable ──
 *  Per explicit request ("the something else should load a panel with the
 *  customers last 10 transactions indicating that 5 of these have been
 *  damaged product claims"), later revised to render inline instead of in
 *  a side panel ("have the instruction container be an accordion open to
 *  the list of transactions") — rendered inside the expandable
 *  "Instruction sent" accordion entry logged once the agent submits
 *  "Something else" on Marcus's top-level question (see
 *  agent-next-gen-marcus-webb-next-best-action-card.tsx's own
 *  `handleTopLevelConfirm`/`MarcusWebbInstructionTransactionsEntry`). No
 *  own outer padding — the accordion's own content wrapper already
 *  supplies `p-4`. Static placeholder data, same scaffold-first reasoning
 *  as agent-next-gen-knowledge-article-card.tsx's own top doc comment. */

export interface MarcusWebbTransaction {
  id: string;
  date: string;
  description: string;
  amount: string;
  type: "purchase" | "damaged-claim";
}

// Written to read as a real pattern — 5 of 10 recent orders coming back as
// damaged-product claims (all electronics, same category as Marcus's own
// current headphones claim) is the signal the agent is meant to notice.
export const MARCUS_WEBB_TRANSACTIONS: MarcusWebbTransaction[] = [
  { id: "txn-1", date: "Jul 18, 2025", description: "Noise-cancelling headphones — cracked ear cup", amount: "$200.00", type: "damaged-claim" },
  { id: "txn-2", date: "Jul 2, 2025", description: "Wireless earbuds — case", amount: "$34.99", type: "purchase" },
  { id: "txn-3", date: "Jun 19, 2025", description: "Bluetooth speaker — water damage", amount: "$89.00", type: "damaged-claim" },
  { id: "txn-4", date: "Jun 3, 2025", description: "USB-C charging cable (3-pack)", amount: "$19.99", type: "purchase" },
  { id: "txn-5", date: "May 21, 2025", description: "Smart watch — cracked screen", amount: "$249.00", type: "damaged-claim" },
  { id: "txn-6", date: "May 8, 2025", description: "Phone case", amount: "$24.99", type: "purchase" },
  { id: "txn-7", date: "Apr 25, 2025", description: "Portable charger — swollen battery", amount: "$45.00", type: "damaged-claim" },
  { id: "txn-8", date: "Apr 11, 2025", description: "HDMI cable", amount: "$12.99", type: "purchase" },
  { id: "txn-9", date: "Mar 29, 2025", description: "Tablet stand — arrived broken", amount: "$29.00", type: "damaged-claim" },
  { id: "txn-10", date: "Mar 14, 2025", description: "Screen protector (2-pack)", amount: "$9.99", type: "purchase" },
];

export function MarcusWebbTransactionsTable() {
  const claimCount = MARCUS_WEBB_TRANSACTIONS.filter((t) => t.type === "damaged-claim").length;
  return (
    <>
      <p className="lyra-body-md text-lyra-fg-default">
        {claimCount} of the customer's last {MARCUS_WEBB_TRANSACTIONS.length} transactions have been damaged-product
        claims.
      </p>
      <div className="h-[420px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="flex-[1.2]">Date</TableHead>
              <TableHead className="flex-[3]">Description</TableHead>
              <TableHead className="flex-1">Amount</TableHead>
              <TableHead className="flex-[1.5]">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MARCUS_WEBB_TRANSACTIONS.map((txn) => (
              <TableRow key={txn.id}>
                <TableCell className="flex-[1.2] text-lyra-fg-secondary">{txn.date}</TableCell>
                <TableCell className="flex-[3]">{txn.description}</TableCell>
                <TableCell className="flex-1 tabular-nums">{txn.amount}</TableCell>
                <TableCell className="flex-[1.5]">
                  {txn.type === "damaged-claim" ? (
                    <Tag variant="warning" label="Damaged Claim" />
                  ) : (
                    <span className="text-lyra-fg-secondary">Purchase</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
