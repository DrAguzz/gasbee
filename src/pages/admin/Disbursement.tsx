import ChipSendBalance from "@/components/admin/ChipSendBalance";
import { FundMovementsCard } from "@/components/admin/FundMovementsCard";
import { DisbursementQueue } from "@/components/admin/DisbursementQueue";
import { Card } from "@/components/ui/card";

const STEPS = [
  { n: 1, title: "Customer bayar", desc: "Duit masuk ke CHIP Collect." },
  { n: 2, title: "Convert ke Send", desc: "Admin convert baki Collect jadi budget CHIP Send." },
  { n: 3, title: "CHIP settle ke bank", desc: "Duit CHIP masuk ke akaun Maybank Gasbee — rekod di bawah." },
  { n: 4, title: "Finance topup semula", desc: "Duit dari Maybank dimasukkan semula ke CHIP — rekod di bawah." },
  { n: 5, title: "Disburse", desc: "Bayar merchant & rider terus ke akaun bank mereka melalui CHIP Send." },
];

export default function Disbursement() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Disbursement</h1>
        <p className="text-sm text-muted-foreground">
          Aliran duit dari CHIP Collect sehingga masuk ke akaun bank merchant dan rider.
        </p>
      </div>

      <Card className="p-4">
        <p className="mb-3 font-semibold">Aliran dana</p>
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
      <FundMovementsCard />
      <DisbursementQueue />
    </div>
  );
}
