export interface TransactionMetadataAccess {
  ticker: string | null;
  quantity: number | null;
  price: number | null;
  strikePrice: number | null;
  expirationDate: string | null;
  notes: string | null;
  source: 'metadata' | 'direct_column' | 'missing';
}

export class TransactionMetadataUtils {
  static getMetadata(transaction: any): TransactionMetadataAccess {
    const metadata = transaction.transaction_metadata || {};

    const ticker = metadata.ticker || (transaction as any).ticker || null;
    const quantity =
      metadata.quantity !== undefined
        ? Number(metadata.quantity)
        : (transaction as any).quantity !== undefined
          ? Number((transaction as any).quantity)
          : null;
    const price =
      metadata.price !== undefined
        ? Number(metadata.price)
        : (transaction as any).price !== undefined
          ? Number((transaction as any).price)
          : null;
    const strikePrice =
      metadata.strikePrice !== undefined ? Number(metadata.strikePrice) : null;
    const expirationDate = metadata.expirationDate || null;
    const notes = metadata.notes || null;

    let source: 'metadata' | 'direct_column' | 'missing' = 'missing';

    if (
      metadata.ticker ||
      metadata.quantity !== undefined ||
      metadata.price !== undefined
    ) {
      source = 'metadata';
    } else if (
      (transaction as any).ticker ||
      (transaction as any).quantity !== undefined ||
      (transaction as any).price !== undefined
    ) {
      source = 'direct_column';
      console.warn(
        `[Transaction Metadata] Found data in direct columns for transaction ${transaction.id}. ` +
          `This should be migrated to transaction_metadata.`
      );
    }

    if (
      source === 'missing' &&
      this.requiresMetadata(transaction.transaction_type)
    ) {
      console.warn(
        `[Transaction Metadata] Transaction ${transaction.id} (${transaction.transaction_type}) ` +
          `is missing required metadata (ticker, quantity, or price). Date: ${transaction.transaction_date}`
      );
    }

    return {
      ticker,
      quantity,
      price,
      strikePrice,
      expirationDate,
      notes,
      source,
    };
  }

  static getTicker(transaction: any): string | null {
    return this.getMetadata(transaction).ticker;
  }

  static getQuantity(transaction: any): number | null {
    return this.getMetadata(transaction).quantity;
  }

  static getPrice(transaction: any): number | null {
    return this.getMetadata(transaction).price;
  }

  static requiresMetadata(transactionType: string): boolean {
    const typesThatRequireMetadata = [
      'stock_buy',
      'stock_sell',
      'stock_dividend',
      'stock_split',
      'option_buy_call',
      'option_buy_put',
      'option_sell_call',
      'option_sell_put',
      'option_exercise',
      'option_expire',
      'etf_buy',
      'etf_sell',
      'etf_dividend',
      'crypto_buy',
      'crypto_sell',
      'crypto_stake',
      'crypto_unstake',
      'bond_purchase',
      'bond_sell',
      'bond_mature',
      'bond_coupon',
      'buy',
      'sell',
    ];

    return typesThatRequireMetadata.some(type =>
      transactionType.toLowerCase().includes(type.toLowerCase())
    );
  }

  static logTransactionDataQuality(transactions: any[]): void {
    let metadataCount = 0;
    let directColumnCount = 0;
    let missingCount = 0;
    let completeCount = 0;

    const problematicTransactions: any[] = [];

    transactions.forEach(txn => {
      const meta = this.getMetadata(txn);

      switch (meta.source) {
        case 'metadata':
          metadataCount++;
          break;
        case 'direct_column':
          directColumnCount++;
          break;
        case 'missing':
          missingCount++;
          if (this.requiresMetadata(txn.transaction_type)) {
            problematicTransactions.push({
              id: txn.id,
              date: txn.transaction_date,
              type: txn.transaction_type,
              description: txn.description,
            });
          }
          break;
      }

      if (
        meta.ticker &&
        (meta.quantity !== null || !this.requiresQuantity(txn.transaction_type))
      ) {
        completeCount++;
      }
    });

    console.log('[Transaction Data Quality Report]');
    console.log(`Total transactions: ${transactions.length}`);
    console.log(`Using metadata: ${metadataCount}`);
    console.log(`Using direct columns (legacy): ${directColumnCount}`);
    console.log(`Missing data: ${missingCount}`);
    console.log(`Complete transactions: ${completeCount}`);
    console.log(
      `Data quality: ${transactions.length > 0 ? ((completeCount / transactions.length) * 100).toFixed(1) : 0}%`
    );

    if (problematicTransactions.length > 0) {
      console.warn(
        `[Transaction Data Quality] Found ${problematicTransactions.length} transactions with missing required data:`
      );
      problematicTransactions.slice(0, 5).forEach(txn => {
        console.warn(
          `  - ${txn.date} | ${txn.type} | ${txn.description} (ID: ${txn.id})`
        );
      });
      if (problematicTransactions.length > 5) {
        console.warn(`  ... and ${problematicTransactions.length - 5} more`);
      }
    }
  }

  static requiresQuantity(transactionType: string): boolean {
    const typesWithoutQuantity = [
      'dividend',
      'interest',
      'fee',
      'deposit',
      'withdrawal',
    ];
    return !typesWithoutQuantity.some(type =>
      transactionType.toLowerCase().includes(type)
    );
  }

  static async migrateDirectColumnsToMetadata(transaction: any): Promise<any> {
    const updates: any = {
      transaction_metadata: transaction.transaction_metadata || {},
    };

    let needsUpdate = false;

    if ((transaction as any).ticker && !updates.transaction_metadata.ticker) {
      updates.transaction_metadata.ticker = (transaction as any).ticker;
      needsUpdate = true;
      console.log(
        `[Migration] Moving ticker to metadata for transaction ${transaction.id}`
      );
    }

    if (
      (transaction as any).quantity !== undefined &&
      updates.transaction_metadata.quantity === undefined
    ) {
      updates.transaction_metadata.quantity = (transaction as any).quantity;
      needsUpdate = true;
      console.log(
        `[Migration] Moving quantity to metadata for transaction ${transaction.id}`
      );
    }

    if (
      (transaction as any).price !== undefined &&
      updates.transaction_metadata.price === undefined
    ) {
      updates.transaction_metadata.price = (transaction as any).price;
      needsUpdate = true;
      console.log(
        `[Migration] Moving price to metadata for transaction ${transaction.id}`
      );
    }

    return needsUpdate ? updates : null;
  }
}
