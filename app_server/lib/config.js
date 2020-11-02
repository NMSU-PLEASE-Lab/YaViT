/* 
    Create and export configuration variables
*/

// Container for all the environments
let environments = {};

// Staging (default) environment
environments.staging = {
    'server': {
        'httpPort' : 5000,
        'httpsPort' : 5001,
        'envName' : 'staging',
    },

    'db': {
        'host': '127.0.0.1',
        'port': 27017,
        'db_name': 'hpc_monitoring',
        'mongoOptions': {
            'useNewUrlParser': true, 
            'useUnifiedTopology': true,
            'useCreateIndex': true 
        }
    },
        
    'jobs': {
        'ingestJobsFromDate': '2020-09-01'
    }
};


// Production environment
environments.production = {
    'server': {
        'httpPort' : 8000,
        'httpsPort' : 8001,
        'envName' : 'production',
    },

    'db': {
        'host': '127.0.0.1',
        'port': 27017,
        'db_name': 'hpc_monitoring',
        'mongoOptions': {
            'useNewUrlParser': true, 
            'useUnifiedTopology': true,
            'useCreateIndex': true 
        }
    },
        
    'jobs': {
        'ingestJobsFromDate': '2020-09-01'
    }
};

// Determine which environment was passed as a command-line argument
let currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that hte current environment is one of the environments above, if not, default to the staging
let environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;