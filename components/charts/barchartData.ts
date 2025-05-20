// Data generator functions for the Skia bar chart

/**
 * Generates random expense data for different time periods
 * @param {string} type - Type of data to generate: 'day', 'week', 'month', or 'year'
 * @param {string} colorScheme - Optional color scheme: 'green', 'blue', 'purple', or 'multi'
 * @returns {Array} Array of data objects compatible with the bar chart
 */
export const generateRandomChartData = (type = 'month', colorScheme = 'green') => {
    let data = [];
    let count = 0;
    
    // Determine number of data points based on type
    switch(type) {
      case 'day':
        count = 24; // Hours in a day
        break;
      case 'week':
        count = 7; // Days in a week
        break;
      case 'month':
        count = 30; // Approx days in a month
        break;
      case 'year':
        count = 12; // Months in a year
        break;
      default:
        count = 30;
    }
    
    // Define color schemes
    const colorMaps = {
      green: ['#4CAF50', '#2E7D32', '#81C784', '#388E3C'],
      blue: ['#2196F3', '#1565C0', '#64B5F6', '#1976D2'],
      purple: ['#9C27B0', '#7B1FA2', '#BA68C8', '#8E24AA'],
      red: ['#F44336', '#C62828', '#EF9A9A', '#D32F2F'],
      multi: ['#4CAF50', '#2196F3', '#9C27B0', '#F44336', '#FF9800', '#FFEB3B']
    };
    
    const selectedColors = colorMaps[colorScheme] || colorMaps.green;
    
    // Generate labels based on type
    const getLabel = (index) => {
      switch(type) {
        case 'day':
          return `${index}h`;
        case 'week':
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return days[index % 7];
        case 'month':
          return `${index + 1}`;
        case 'year':
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return months[index % 12];
        default:
          return `${index + 1}`;
      }
    };
    
    // Generate random data
    for (let i = 0; i < count; i++) {
      // Create some patterns in the data rather than pure randomness
      let value;
      if (type === 'day') {
        // More spending during daytime hours
        if (i >= 8 && i <= 20) {
          value = Math.floor(Math.random() * 500) + 200;
        } else {
          value = Math.floor(Math.random() * 200) + 50;
        }
      } else if (type === 'week') {
        // More spending on weekends
        if (i === 0 || i === 6) {
          value = Math.floor(Math.random() * 1000) + 500;
        } else {
          value = Math.floor(Math.random() * 500) + 200;
        }
      } else if (type === 'month') {
        // Payday patterns (higher spending at beginning/mid/end of month)
        if (i === 0 || i === 14 || i === 29) {
          value = Math.floor(Math.random() * 1500) + 800;
        } else {
          value = Math.floor(Math.random() * 700) + 300;
        }
      } else { // year
        // Seasonal patterns (higher in Dec, Jul, Aug)
        if (i === 11 || i === 6 || i === 7) {
          value = Math.floor(Math.random() * 5000) + 3000;
        } else {
          value = Math.floor(Math.random() * 3000) + 1000;
        }
      }
      
      // Get a color from the selected scheme
      const colorIndex = i % selectedColors.length;
      const frontColor = selectedColors[colorIndex];
      
      data.push({
        label: getLabel(i),
        value: value,
        frontColor: frontColor
      });
    }
    
    return data;
  };
  
  /**
   * Demo usage function to show how to use the chart with this data
   */
  export const getDemoChartData = () => {
    // Example usage for different time periods
    const dayData = generateRandomChartData('day', 'blue');
    const weekData = generateRandomChartData('week', 'green');
    const monthData = generateRandomChartData('month', 'purple');
    const yearData = generateRandomChartData('year', 'multi');
    
    return {
      dayData,
      weekData,
      monthData,
      yearData
    };
  };
  
  /**
   * Example of how to use this with the bar chart component
   */
  export const getBarChartExample = () => {
    // Usage example - not actual code to run
    return `
    // Import the data generator
    import { generateRandomChartData } from './path/to/this/file';
    
    // In your component
    const MyBarChartComponent = () => {
      // Generate random data for monthly expenses
      const chartData = generateRandomChartData('month', 'green');
      
      // Define callback for bar press
      const handleBarPress = (item, index) => {
        console.log('Bar pressed:', item.label, 'with value:', item.value);
        // Do something with the selected data
      };
      
      return (
        <BarChart 
          data={chartData}
          type="month"
          onBarPress={handleBarPress}
          barbackgroundColor="rgba(76, 175, 80, 0.1)"
          textColor="#333333"
        />
      );
    };
    `;
  };