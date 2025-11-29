import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Wallet, TrendingUp, Receipt, X } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Wallet,
      title: 'Welcome to Your Wealth Tracker',
      description:
        'Track all your financial accounts, investments, and transactions in one place.',
      action: 'Get Started',
    },
    {
      icon: TrendingUp,
      title: 'Add Your Accounts',
      description:
        'Start by adding your bank accounts, investment accounts, credit cards, and loans to see your complete financial picture.',
      action: 'Next',
    },
    {
      icon: Receipt,
      title: 'Track Transactions',
      description:
        'Log your income, expenses, and investments to understand your cash flow and spending patterns.',
      action: 'Finish',
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-8 bg-white border-0 shadow-2xl relative">
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <Icon className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {currentStep.title}
          </h2>

          <p className="text-gray-600 mb-8">
            {currentStep.description}
          </p>

          <div className="flex gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === step
                    ? 'w-8 bg-blue-600'
                    : index < step
                      ? 'w-2 bg-blue-400'
                      : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white"
          >
            {currentStep.action}
          </Button>

          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="mt-4 text-sm text-gray-600 hover:text-gray-900"
            >
              Back
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
