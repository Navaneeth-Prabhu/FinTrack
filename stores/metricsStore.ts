import { create } from 'zustand';
import { getDashboardMetrics, DashboardMetrics, getChartMetrics, ChartDataPoint } from '../db/repository/metricsRepository';

interface MetricsState {
    dashboardMetrics: DashboardMetrics | null;
    chartData: ChartDataPoint[];
    isLoading: boolean;
    isChartLoading: boolean;
    error: string | null;

    fetchDashboardMetrics: () => Promise<void>;
    fetchChartMetrics: (period: 'week' | 'month' | 'year', type: 'income' | 'expense') => Promise<void>;
}

export const useMetricsStore = create<MetricsState>((set) => ({
    dashboardMetrics: null,
    chartData: [],
    isLoading: true,
    isChartLoading: true,
    error: null,

    fetchDashboardMetrics: async () => {
        try {
            set({ isLoading: true, error: null });
            const metrics = await getDashboardMetrics();
            set({ dashboardMetrics: metrics, isLoading: false });
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to fetch dashboard metrics',
            });
            console.error(error);
        }
    },

    fetchChartMetrics: async (period, type) => {
        try {
            set({ isChartLoading: true, error: null });
            const chartData = await getChartMetrics(period, type);
            set({ chartData, isChartLoading: false });
        } catch (error) {
            set({
                isChartLoading: false,
                error: error instanceof Error ? error.message : 'Failed to fetch chart metrics',
            });
            console.error(error);
        }
    }
}));
