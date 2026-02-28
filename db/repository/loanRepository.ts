import * as SQLite from 'expo-sqlite';
import { Loan } from '@/types';
import { initDatabase } from '../services/sqliteService';

export const saveLoanToDB = async (loan: Loan): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync(
        `INSERT INTO loans (
      id, lender, loanType, principal, outstanding, emiAmount, 
      emiDueDay, tenureMonths, startDate, status, source, notes, 
      createdAt, lastModified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        loan.id,
        loan.lender,
        loan.loanType,
        loan.principal,
        loan.outstanding,
        loan.emiAmount,
        loan.emiDueDay,
        loan.tenureMonths,
        loan.startDate,
        loan.status,
        loan.source,
        loan.notes ?? null,
        loan.createdAt,
        loan.lastModified
    );
};

export const fetchLoansFromDB = async (): Promise<Loan[]> => {
    const db = await initDatabase();
    const result = await db.getAllAsync<any>(
        'SELECT * FROM loans ORDER BY createdAt DESC'
    );

    return result.map(row => ({
        ...row,
        notes: row.notes !== null ? row.notes : undefined,
    }));
};

export const updateLoanInDB = async (loan: Loan): Promise<Loan> => {
    const db = await initDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
        `UPDATE loans SET 
      lender = ?, loanType = ?, principal = ?, outstanding = ?, 
      emiAmount = ?, emiDueDay = ?, tenureMonths = ?, startDate = ?, 
      status = ?, source = ?, notes = ?, lastModified = ?
    WHERE id = ?`,
        loan.lender,
        loan.loanType,
        loan.principal,
        loan.outstanding,
        loan.emiAmount,
        loan.emiDueDay,
        loan.tenureMonths,
        loan.startDate,
        loan.status,
        loan.source,
        loan.notes ?? null,
        now,
        loan.id
    );
    return { ...loan, lastModified: now };
};

export const deleteLoanFromDB = async (id: string): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync('DELETE FROM loans WHERE id = ?', id);
};
