import { savePriceSnapshotToDB, fetchPriceSnapshotsByHoldingIdFromDB } from '../priceSnapshotRepository';
import { initDatabase } from '../../services/sqliteService';

jest.mock('../../services/sqliteService');

describe('PriceSnapshot Repository (Test Gate 3.3)', () => {
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

    it('saves a price snapshot', async () => {
        const mockSnap: any = {
            id: 'snap1',
            holding_id: 'holding1',
            price: 2500,
            recorded_at: '2023-01-01',
            source: 'amfi',
            created_at: '2023-01-01'
        };

        await savePriceSnapshotToDB(mockSnap);
        expect(mockDb.runAsync).toHaveBeenCalled();
        const sqlArg = mockDb.runAsync.mock.calls[0][0];
        expect(sqlArg).toContain('INSERT INTO price_snapshots');
    });

    it('fetches price snapshots and handles missing manual source', async () => {
        mockDb.getAllAsync.mockResolvedValue([
            { id: 'snap1', price: 2500, source: null }
        ]);

        const results = await fetchPriceSnapshotsByHoldingIdFromDB('holding1');
        expect(results).toHaveLength(1);
        expect(results[0].source).toBeUndefined();
    });
});
