// Mock React Native modules so we can run parser tests in Node
const mockModule = require('module');
const originalRequire = mockModule.prototype.require;

mockModule.prototype.require = function (path) {
    if (path === 'react-native') {
        return {
            PermissionsAndroid: {
                request: async () => 'granted',
                check: async () => true,
                PERMISSIONS: { READ_SMS: 'android.permission.READ_SMS' },
                RESULTS: { GRANTED: 'granted' }
            }
        };
    }
    if (path === '@react-native-async-storage/async-storage') {
        return {
            setItem: async () => { },
            getItem: async () => null,
        };
    }
    return originalRequire.apply(this, arguments);
};

// Now register ts-node / tsx hooks (we'll just use ts-node register programmatically)
require('ts-node').register({
    transpileOnly: true,
    compilerOptions: { module: 'commonjs' }
});

// Run the script
require('../scripts/testSMSParser.ts');
