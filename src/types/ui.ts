/**
 * UI-specific types and interfaces
 */

export type Theme = 'light' | 'dark' | 'system';

export type ViewMode = 'grid' | 'list' | 'table';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface FilterConfig {
  field: string;
  operator:
    | 'equals'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'between';
  value: any;
}

export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T) => React.ReactNode;
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  [key: string]: any;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area';
  data: ChartDataPoint[];
  xAxisKey: string;
  yAxisKey: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

// Navigation types
export type NavigationItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  children?: NavigationItem[];
};

export type TabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
};

// Modal and dialog types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface ConfirmDialogProps extends ModalProps {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

// Form types
export interface FormField<T = any> {
  name: keyof T;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'select'
    | 'textarea'
    | 'date'
    | 'checkbox'
    | 'radio';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: any; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
}

export interface FormConfig<T = any> {
  fields: FormField<T>[];
  submitText?: string;
  resetText?: string;
  onSubmit: (data: T) => void | Promise<void>;
  onReset?: () => void;
  initialValues?: Partial<T>;
  validationSchema?: any; // Zod schema
}

// Loading and error states
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface AsyncState<T> extends LoadingState {
  data: T | null;
  refetch?: () => void;
}

// Toast notification types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}
