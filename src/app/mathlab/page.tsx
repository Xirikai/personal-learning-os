import { PageHeader } from "@/components/Card";
import { PercentTool, QuadraticSolver } from "@/components/MathTools";

export default function MathLabPage() {
  return (
    <div>
      <PageHeader title="MathLab" description="Простые математические инструменты. Вычисления выполняются в браузере." />
      <div className="grid gap-6 md:grid-cols-2">
        <QuadraticSolver />
        <PercentTool />
      </div>
    </div>
  );
}
