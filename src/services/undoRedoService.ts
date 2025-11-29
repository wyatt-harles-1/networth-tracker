import { supabase } from '@/lib/supabase';
import { Transaction, TransactionInsert } from '@/types/transaction';

export interface UndoAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  timestamp: Date;
  data: {
    transaction?: Transaction;
    previousState?: Transaction;
  };
  description: string;
}

/**
 * Service for transaction undo/redo functionality
 */
export class UndoRedoService {
  private static undoStack: UndoAction[] = [];
  private static redoStack: UndoAction[] = [];
  private static maxStackSize = 50;

  /**
   * Record a transaction create action
   */
  static recordCreate(transaction: Transaction): void {
    const action: UndoAction = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'create',
      timestamp: new Date(),
      data: { transaction },
      description: `Created transaction: ${transaction.description}`,
    };

    this.addToUndoStack(action);
    this.redoStack = []; // Clear redo stack on new action
  }

  /**
   * Record a transaction update action
   */
  static recordUpdate(previousState: Transaction, newState: Transaction): void {
    const action: UndoAction = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'update',
      timestamp: new Date(),
      data: {
        transaction: newState,
        previousState,
      },
      description: `Updated transaction: ${newState.description}`,
    };

    this.addToUndoStack(action);
    this.redoStack = [];
  }

  /**
   * Record a transaction delete action
   */
  static recordDelete(transaction: Transaction): void {
    const action: UndoAction = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'delete',
      timestamp: new Date(),
      data: { transaction },
      description: `Deleted transaction: ${transaction.description}`,
    };

    this.addToUndoStack(action);
    this.redoStack = [];
  }

  /**
   * Add action to undo stack
   */
  private static addToUndoStack(action: UndoAction): void {
    this.undoStack.push(action);

    // Maintain max stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
  }

  /**
   * Undo the last action
   */
  static async undo(
    userId: string
  ): Promise<{ success: boolean; error?: string; action?: UndoAction }> {
    const action = this.undoStack.pop();

    if (!action) {
      return { success: false, error: 'Nothing to undo' };
    }

    try {
      switch (action.type) {
        case 'create':
          // Delete the created transaction
          await this.deleteTransaction(action.data.transaction!.id, userId);
          break;

        case 'update':
          // Restore previous state
          await this.updateTransaction(
            action.data.transaction!.id,
            action.data.previousState!,
            userId
          );
          break;

        case 'delete':
          // Recreate the deleted transaction
          await this.createTransaction(action.data.transaction!, userId);
          break;
      }

      this.redoStack.push(action);
      return { success: true, action };
    } catch (error) {
      // Restore action to undo stack if operation failed
      this.undoStack.push(action);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Undo failed',
      };
    }
  }

  /**
   * Redo the last undone action
   */
  static async redo(
    userId: string
  ): Promise<{ success: boolean; error?: string; action?: UndoAction }> {
    const action = this.redoStack.pop();

    if (!action) {
      return { success: false, error: 'Nothing to redo' };
    }

    try {
      switch (action.type) {
        case 'create':
          // Recreate the transaction
          await this.createTransaction(action.data.transaction!, userId);
          break;

        case 'update':
          // Re-apply the update
          await this.updateTransaction(
            action.data.transaction!.id,
            action.data.transaction!,
            userId
          );
          break;

        case 'delete':
          // Re-delete the transaction
          await this.deleteTransaction(action.data.transaction!.id, userId);
          break;
      }

      this.undoStack.push(action);
      return { success: true, action };
    } catch (error) {
      // Restore action to redo stack if operation failed
      this.redoStack.push(action);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Redo failed',
      };
    }
  }

  /**
   * Delete a transaction
   */
  private static async deleteTransaction(
    transactionId: string,
    userId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Update a transaction
   */
  private static async updateTransaction(
    transactionId: string,
    transaction: Transaction,
    userId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update({
        account_id: transaction.account_id,
        transaction_date: transaction.transaction_date,
        amount: transaction.amount,
        description: transaction.description,
        transaction_type: transaction.transaction_type,
        transaction_metadata: transaction.transaction_metadata,
      })
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Create a transaction
   */
  private static async createTransaction(
    transaction: Transaction,
    userId: string
  ): Promise<void> {
    const { error } = await supabase.from('transactions').insert({
      id: transaction.id,
      user_id: userId,
      account_id: transaction.account_id,
      transaction_date: transaction.transaction_date,
      amount: transaction.amount,
      description: transaction.description,
      transaction_type: transaction.transaction_type,
      transaction_metadata: transaction.transaction_metadata,
    });

    if (error) throw error;
  }

  /**
   * Get undo/redo history
   */
  static getHistory(): {
    undoActions: UndoAction[];
    redoActions: UndoAction[];
    canUndo: boolean;
    canRedo: boolean;
  } {
    return {
      undoActions: [...this.undoStack].reverse(),
      redoActions: [...this.redoStack].reverse(),
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
    };
  }

  /**
   * Clear all history
   */
  static clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get the last action description
   */
  static getLastAction(): string | null {
    const action = this.undoStack[this.undoStack.length - 1];
    return action ? action.description : null;
  }
}
