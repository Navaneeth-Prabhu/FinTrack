import InvestmentsScreen from '@/screens/investment/investments.screen';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Investments() {
    return (
        <ErrorBoundary>
            <InvestmentsScreen />
        </ErrorBoundary>
    );
}
