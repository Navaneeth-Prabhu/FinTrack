import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { format } from 'date-fns';
import { PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { Budget, Category } from '../types';
import { useMetricsStore } from '../stores/metricsStore';
import { useBudgetStore } from '../stores/budgetStore';
import { useCategoryStore } from '../stores/categoryStore';

const SmartBudgetInterface = () => {
  const { dashboardMetrics } = useMetricsStore();
  const { budgets } = useBudgetStore();
  const { categories } = useCategoryStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<Budget[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<'default' | 'save' | 'splurge'>('default');

  // Calculate scenario budgets
  useEffect(() => {
    if (budgets.length === 0) return;

    // Deep copy of budgets to avoid mutation
    const defaultBudgets = JSON.parse(JSON.stringify(budgets));

    // Create save scenario (reduce spending by 15%)
    const saveBudgets = defaultBudgets.map((budget: Budget) => ({
      ...budget,
      limit: budget.limit * 0.85,
    }));

    // Create splurge scenario (increase spending by 10%)
    const splurgeBudgets = defaultBudgets.map((budget: Budget) => ({
      ...budget,
      limit: budget.limit * 1.1,
    }));

    // Set the appropriate recommendations based on selected scenario
    switch (selectedScenario) {
      case 'save':
        setRecommendations(saveBudgets);
        break;
      case 'splurge':
        setRecommendations(splurgeBudgets);
        break;
      default:
        setRecommendations(defaultBudgets);
    }
  }, [budgets, selectedScenario]);

  // Function to generate AI recommendations
  const generateRecommendations = () => {
    setIsGenerating(true);

    // Simulate AI recommendation generation
    setTimeout(() => {
      // This would be replaced with actual AI logic
      const newRecommendations = [...budgets].map(budget => {
        // Use pre-calculated SQL aggregates for category spending
        const totalSpent = dashboardMetrics?.expensesByBudgetCategory[budget.category.id] || 0;

        // If spending is higher than 90% of budget, recommend 10% increase
        // If spending is less than 60% of budget, recommend 5% decrease
        let recommendedLimit = budget.limit;

        if (totalSpent > budget.limit * 0.9) {
          recommendedLimit = budget.limit * 1.1;
        } else if (totalSpent < budget.limit * 0.6) {
          recommendedLimit = budget.limit * 0.95;
        }

        return {
          ...budget,
          limit: Math.round(recommendedLimit),
        };
      });

      setRecommendations(newRecommendations);
      setIsGenerating(false);
    }, 1500);
  };

  // Prepare data for pie chart
  const pieData = recommendations.map((budget) => ({
    value: budget.limit,
    text: budget.limit.toString(),
    color: budget.category.color,
    label: budget.category.name,
  }));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Budget</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={generateRecommendations}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#007AFF" />
          ) : (
            <Ionicons name="refresh" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        AI-recommended budget allocations based on your spending patterns
      </Text>

      {/* Scenario selection */}
      <View style={styles.scenarioContainer}>
        <Text style={styles.scenarioLabel}>What-if Scenarios:</Text>
        <View style={styles.scenarioButtons}>
          <TouchableOpacity
            style={[
              styles.scenarioButton,
              selectedScenario === 'default' && styles.selectedScenario
            ]}
            onPress={() => setSelectedScenario('default')}
          >
            <Text style={[
              styles.scenarioText,
              selectedScenario === 'default' && styles.selectedScenarioText
            ]}>Default</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.scenarioButton,
              selectedScenario === 'save' && styles.selectedScenario
            ]}
            onPress={() => setSelectedScenario('save')}
          >
            <Text style={[
              styles.scenarioText,
              selectedScenario === 'save' && styles.selectedScenarioText
            ]}>Save More</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.scenarioButton,
              selectedScenario === 'splurge' && styles.selectedScenario
            ]}
            onPress={() => setSelectedScenario('splurge')}
          >
            <Text style={[
              styles.scenarioText,
              selectedScenario === 'splurge' && styles.selectedScenarioText
            ]}>Splurge</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Budget visualization */}
      <View style={styles.chartContainer}>
        <PieChart
          data={pieData}
          donut
          showText
          textColor="black"
          radius={120}
          innerRadius={80}
          textSize={12}
          focusOnPress
          showValuesAsLabels
        />
      </View>

      {/* Budget adjustments list */}
      <View style={styles.recommendationsContainer}>
        <Text style={styles.recommendationsTitle}>Recommended Adjustments</Text>

        {recommendations.map((budget) => (
          <View key={budget.id} style={styles.budgetItem}>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryIcon}>{budget.category.icon}</Text>
              <Text style={styles.categoryName}>{budget.category.name}</Text>
            </View>

            <View style={styles.budgetInfo}>
              <View style={styles.budgetComparison}>
                <Text style={styles.currentBudget}>
                  Current: ${budgets.find(b => b.id === budget.id)?.limit || 0}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color="#888"
                  style={styles.arrow}
                />
                <Text style={styles.recommendedBudget}>
                  New: ${budget.limit}
                </Text>
              </View>

              <TouchableOpacity style={styles.applyButton}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1c1e',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  subtitle: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    color: '#636366',
    fontSize: 14,
  },
  scenarioContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  scenarioLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1c1c1e',
  },
  scenarioButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scenarioButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  scenarioText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  selectedScenario: {
    backgroundColor: '#007AFF',
  },
  selectedScenarioText: {
    color: '#fff',
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  recommendationsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1c1c1e',
  },
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 16,
    color: '#1c1c1e',
  },
  budgetInfo: {
    alignItems: 'flex-end',
  },
  budgetComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentBudget: {
    fontSize: 14,
    color: '#636366',
  },
  arrow: {
    marginHorizontal: 4,
  },
  recommendedBudget: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  applyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
  },
  applyButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default SmartBudgetInterface;