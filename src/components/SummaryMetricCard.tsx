import { Card } from '@/components/ui/card';

interface SummaryMetricCardProps {
  label: string;
  value: string;
  variant: 'green' | 'red' | 'blue';
}

export function SummaryMetricCard({
  label,
  value,
  variant,
}: SummaryMetricCardProps) {
  const variantClasses = {
    green: {
      card: 'bg-green-50 border-green-200',
      label: 'text-green-600',
      value: 'text-green-700',
    },
    red: {
      card: 'bg-red-50 border-red-200',
      label: 'text-red-600',
      value: 'text-red-700',
    },
    blue: {
      card: 'bg-blue-50 border-blue-200',
      label: 'text-blue-600',
      value: 'text-blue-700',
    },
  };

  const classes = variantClasses[variant];

  return (
    <Card className={`p-3 ${classes.card}`}>
      <p className={`text-xs ${classes.label} mb-1`}>{label}</p>
      <p className={`text-lg font-bold ${classes.value}`}>{value}</p>
    </Card>
  );
}
