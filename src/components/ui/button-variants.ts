import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-gray-900 shadow hover:bg-primary/90',
        destructive:
          'bg-red-600 text-white shadow-sm hover:bg-red-700 border-red-600',
        outline:
          'border border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-50 hover:text-gray-900',
        secondary:
          'bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200 border-gray-200',
        ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
        link: 'text-blue-600 underline-offset-4 hover:underline hover:text-blue-700',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

