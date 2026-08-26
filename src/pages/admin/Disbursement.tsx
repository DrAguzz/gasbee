import { useRef } from "react";
import ChipSendBalance from "@/components/admin/ChipSendBalance";
import { ChipTopupCard } from "@/components/admin/ChipTopupCard";
import { FundMovementsCard, type FundMovementsHandle } from "@/components/admin/FundMovementsCard";
import { DisbursementQueue } from "@/components/admin/DisbursementQueue";
import { Card } from "@/components/ui/card";

const STEPS = [
  { n: 1, title: "Customer pays", desc: "Money lands in CHIP Collect." },
  { n: 2, title: "Convert to Send", desc: "Admin converts the Collect balance into CHIP Send budget." },
  { n: 3, title: "CHIP settles to bank", desc: "CHIP pays out to the Gasbee Maybank account — record it below." },
  { n: 4, title: "Finance tops up", desc: "Pay the top-up link to move money from Maybank back into CHIP Collect." },
  { n: 5, title: "Disburse", desc: "Pay merchants and riders directly to their bank accounts via CHIP Send." },
];

export default function Disbursement() {
  const movementsRef = useRef<FundMovementsHandle>(null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Disbursement</h1>
        <p className="text-sm text-muted-foreground">
          Money flow from CHIP Collect all the way to merchant and rider bank accounts.
        </p>
      </div>

      <Card className="p-4">
        <p className="mb-3 font-semibold">Fund flow</p>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-lg border p-3">
              <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {s.n}
              </div>
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ol>
      </Card>

      <ChipSendBalance />
      <ChipTopupCard onChanged={() => movementsRef.current?.reload()} />
      <FundMovementsCard ref={movementsRef} />
      <DisbursementQueue />
    </div>
  );
}
