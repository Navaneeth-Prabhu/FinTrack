import { saveInvestmentTxToDB, fetchInvestmentTxsByHoldingId } from '../investmentTxRepository';
import { initDatabase } from '../../services/sqliteService';

jest.mock('../../services/sqliteService');

describe('InvestmentTx Repository (Test Gate 3.1)', () => {
    let mockDb: any;

    beforeEach(() => {
        mockDb = {
            runAsync: jest.fn(),
            getAllAsync: jest.fn().mockResolvedValue([]),
        };
        (initDatabase as jest.Mock).mockResolvedValue(mockDb);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('saves an investment transaction', async () => {
        const mockTx: any = {
            id: 'tx1',
            holding_id: 'holding1',
            holding_type: 'sip',
            event_type: 'allotment',
            amount: 5000,
            units: 10,
            nav: 500,
            event_date: '2023-01-01',
            updated_at: '2023-01-01',
            created_at: '2023-01-01',
            is_deleted: 0
        };

        await saveInvestmentTxToDB(mockTx);
        expect(mockDb.runAsync).toHaveBeenCalled();
        const sqlArg = mockDb.runAsync.mock.calls[0][0];
        expect(sqlArg).toContain('INSERT INTO investment_transactions');
        expect(mockDb.runAsync.mock.calls[0]).toContain(mockTx.amount);
    });

    it('fetches and maps optional fields successfully', async () => {
        mockDb.getAllAsync.mockResolvedValue([
            { id: 'tx1', amount: 5000, units: null, is_deleted: 0 }
        ]);

        const results = await fetchInvestmentTxsByHoldingId('holding1');
        expect(results).toHaveLength(1);
        expect(results[0].units).toBeUndefined();
        expect(results[0].is_deleted).toBe(false);
    });
});
