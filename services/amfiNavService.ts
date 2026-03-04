/**
 * Service to fetch and parse AMFI NAV data.
 * AMFI Data URL: https://www.amfiindia.com/spages/NAVAll.txt
 */

export interface AmfiNavData {
    schemeCode: string;
    isinDivPayout: string;
    isinDivReinvestment: string;
    schemeName: string;
    netAssetValue: number;
    date: string;
}

const AMFI_NAV_URL = 'https://www.amfiindia.com/spages/NAVAll.txt';

class AmfiNavService {
    private navData: Map<string, AmfiNavData> = new Map();
    private lastFetched: Date | null = null;
    private fetchPromise: Promise<void> | null = null;

    // Cache valid for 12 hours
    private readonly CACHE_DURATION_MS = 12 * 60 * 60 * 1000;

    /**
     * Fetches and parses the latest NAV data from AMFI
     */
    public async fetchLatestNavData(force = false): Promise<void> {
        if (!force && this.lastFetched && (Date.now() - this.lastFetched.getTime() < this.CACHE_DURATION_MS)) {
            // Use cached data
            return;
        }

        if (this.fetchPromise) {
            return this.fetchPromise;
        }

        this.fetchPromise = this._fetchAndParse();
        await this.fetchPromise;
    }

    private async _fetchAndParse(): Promise<void> {
        try {
            console.log('Fetching AMFI NAV data...');
            const response = await fetch(AMFI_NAV_URL);

            if (!response.ok) {
                throw new Error(`Failed to fetch AMFI NAV data: ${response.status}`);
            }

            const text = await response.text();
            this.parseAmfiData(text);
            this.lastFetched = new Date();
            console.log(`Parsed ${this.navData.size} AMFI schemes.`);
        } catch (error) {
            console.error('Error fetching AMFI NAV data:', error);
            throw error;
        } finally {
            this.fetchPromise = null;
        }
    }

    private parseAmfiData(text: string) {
        this.navData.clear();

        const lines = text.split('\n');

        for (const line of lines) {
            // Skip empty lines or header lines
            if (!line || line.trim() === '' || line.includes('Scheme Code;ISIN')) {
                continue;
            }

            // Data format: Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
            const parts = line.split(';');

            if (parts.length >= 6) {
                const schemeCode = parts[0].trim();
                const netAssetValueRaw = parts[4].trim();

                // Skip if NAV is not a valid number (e.g. N.A.)
                const netAssetValue = parseFloat(netAssetValueRaw);
                if (isNaN(netAssetValue)) continue;

                this.navData.set(schemeCode, {
                    schemeCode: schemeCode,
                    isinDivPayout: parts[1].trim(),
                    isinDivReinvestment: parts[2].trim(),
                    schemeName: parts[3].trim(),
                    netAssetValue: netAssetValue,
                    date: parts[5].trim(),
                });
            }
        }
    }

    /**
     * Get NAV by Scheme Code
     */
    public async getNavBySchemeCode(schemeCode: string): Promise<AmfiNavData | null> {
        await this.fetchLatestNavData();
        return this.navData.get(schemeCode.trim()) || null;
    }

    /**
     * Search schemes by name (useful for a dropdown/search UI later)
     */
    public async searchSchemesByName(query: string, limit: number = 20): Promise<AmfiNavData[]> {
        await this.fetchLatestNavData();

        const results: AmfiNavData[] = [];
        const lowerQuery = query.toLowerCase();

        for (const data of this.navData.values()) {
            if (data.schemeName.toLowerCase().includes(lowerQuery)) {
                results.push(data);
                if (results.length >= limit) break;
            }
        }

        return results;
    }
}

export const amfiNavService = new AmfiNavService();
