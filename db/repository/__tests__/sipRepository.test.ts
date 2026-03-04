import { saveSIPToDB, fetchSIPsFromDB, updateSIPInDB } from '../sipRepository';
import { initDatabase } from '../../services/sqliteService';

jest.mock('../../services/sqliteService');

describe('SIP Repository (Test Gate 3.4)', () => {
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

    it('saves an SIP plan with V2 fields (currentValue, schemeCode, isDeleted)', async () => {
        const mockSip: any = {
            id: 'sip1',
            name: 'Nifty 50',
            fundName: 'UTI Nifty 50',
            amount: 5000,
            frequency: 'monthly',
            startDate: '2023-01-01',
            nextDueDate: '2024-01-01',
            sipDay: 5,
            totalInvested: 60000,
            units: 100,
            nav: 650,
            status: 'active',
            categoryId: 'inv1',
            createdAt: '2023-01-01',
            lastModified: '2023-01-01',
            currentValue: 65000,
            schemeCode: '120716',
            isDeleted: false
        };

        await saveSIPToDB(mockSip);
        expect(mockDb.runAsync).toHaveBeenCalled();

        // Ensure the array of arguments has length 20 (query + 19 args)
        // 0: sql query, 1: id, ... 18: currentValue, 19: schemeCode, 20: isDeleted
        expect(mockDb.runAsync.mock.calls[0].length).toBe(21);

        // currentValue maps correctly to the second to last arg
        expect(mockDb.runAsync.mock.calls[0][18]).toBe(65000);
        // schemeCode 
        expect(mockDb.runAsync.mock.calls[0][19]).toBe('120716');
        // isDeleted (boolean maps to 0/1)
        expect(mockDb.runAsync.mock.calls[0][20]).toBe(0);
    });

    it('fetches SIP plans mapping V2 columns securely', async () => {
        mockDb.getAllAsync.mockResolvedValue([
            { id: 'sip1', name: 'Nifty 50', currentValue: 65000, schemeCode: null, isDeleted: 0 }
        ]);

        const results = await fetchSIPsFromDB();
        expect(results).toHaveLength(1);
        expect(results[0].currentValue).toBe(65000);
        expect(results[0].schemeCode).toBeUndefined(); // null should map to undefined
        expect(results[0].isDeleted).toBe(false);
    });

    it('updates an existing SIP containing V2 fields', async () => {
        const mockSip: any = {
            id: 'sip1',
            name: 'Nifty 50',
            fundName: 'UTI Nifty 50',
            amount: 5000,
            frequency: 'monthly',
            startDate: '2023-01-01',
            nextDueDate: '2024-01-01',
            sipDay: 5,
            totalInvested: 60000,
            units: 100,
            nav: 650,
            status: 'active',
            categoryId: 'inv1',
            currentValue: 65000,
            isDeleted: false
        };

        await updateSIPInDB(mockSip);
        expect(mockDb.runAsync).toHaveBeenCalled();
        const sqlArg = mockDb.runAsync.mock.calls[0][0];
        expect(sqlArg).toContain('currentValue = ?');
        expect(sqlArg).toContain('isDeleted = ?');
    });
});
