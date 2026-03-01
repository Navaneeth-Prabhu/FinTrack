import { useAlertStore } from '@/stores/alertStore';
import { fetchLoansFromDB } from '@/db/repository/loanRepository';
import { differenceInDays, setDate, isBefore, addMonths, startOfDay } from 'date-fns';

/**
 * Checks all active loans and generates a local alert if the EMI is due within 3 days.
 * Includes deduplication logic to ensure we don't spam the user with the same alert.
 */
export const checkAndGenerateEmiAlerts = async () => {
    try {
        const loans = await fetchLoansFromDB();
        const now = new Date();
        const today = startOfDay(now);

        // We check the existing alerts in the store to deduplicate
        // If the store isn't loaded yet, fetch alerts directly to be safe
        const alertStore = useAlertStore.getState();
        if (alertStore.alerts.length === 0 && !alertStore.isLoading) {
            await alertStore.fetchAlerts();
        }

        const existingAlerts = useAlertStore.getState().alerts;

        for (const loan of loans) {
            if (loan.status !== 'active') continue;

            // Calculate the exact next EMI date
            let emiDate = setDate(now, loan.emiDueDay);

            // If the day has already passed this month, the next EMI is next month
            if (isBefore(emiDate, today)) {
                emiDate = addMonths(emiDate, 1);
            }

            const daysUntilEmi = differenceInDays(emiDate, today);

            // Alert condition: EMI is due in 0 to 3 days
            if (daysUntilEmi >= 0 && daysUntilEmi <= 3) {
                // Deduplication: 
                // We create a unique "signature" for this specific EMI event (Loan ID + Month + Year)
                // We use the `smsId` field on the alert to store this signature since it's an EMI alert, not an SMS alert.
                const emiSignature = `emi_${loan.id}_${emiDate.getFullYear()}_${emiDate.getMonth()}`;

                // Check if we already generated an alert for this specific month's EMI
                const alreadyAlerted = existingAlerts.some(a =>
                    a.type === 'loan_alert' &&
                    a.smsId === emiSignature
                );

                if (!alreadyAlerted) {
                    await alertStore.addAlert({
                        type: 'loan_alert', // using 'loan_alert' from the SMSAlert type definition
                        title: `EMI Due ${daysUntilEmi === 0 ? 'Today' : `in ${daysUntilEmi} days`}`,
                        body: `Your ${loan.loanType} loan EMI of ₹${loan.emiAmount.toLocaleString('en-IN')} is due on ${emiDate.toLocaleDateString('en-IN')}.`,
                        amount: loan.emiAmount,
                        bank: loan.lender,
                        smsId: emiSignature, // Using smsId to store our deduplication signature
                    });

                    console.log(`[EMI Alert] Generated alert for Loan ${loan.lender} due in ${daysUntilEmi} days`);
                }
            }
        }
    } catch (error) {
        console.error('[EMI Alert] Error checking EMI alerts:', error);
    }
};
