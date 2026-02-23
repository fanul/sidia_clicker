# SIDIA Automation - Refactored

A refactored Node.js implementation of the SIDIA (BPJS Ketenagakerjaan) document processing automation system.

## 🏗️ Architecture

The refactored codebase follows a modular architecture with clear separation of concerns:

### Module Structure

```
sidia-clicker/
├── index.js          # Main entry point and workflow orchestration
├── constants.js      # Selectors, timing, and configuration constants
├── browser.js        # Browser launch and configuration
├── session.js        # Session persistence and recovery
├── login.js          # Authentication and role selection
├── documents.js      # Document processing workflow
├── pageHelper.js     # Reusable page interaction utilities
├── stats.js          # Statistics tracking and display
├── utils.js          # General utility functions
└── .env              # Configuration and credentials
```

### Key Improvements

1. **Modular Design**: Separated concerns into focused modules
2. **Better Organization**: Related functionality grouped together
3. **Improved Maintainability**: Easier to locate and modify specific features
4. **Enhanced Testing**: Modular code is easier to test
5. **Better Documentation**: JSDoc comments for all functions
6. **Code Reusability**: Shared utilities reduce duplication
7. **Error Handling**: Consistent error handling patterns

## 📦 Module Details

### constants.js
- **Purpose**: Centralized configuration and selector definitions
- **Exports**: SELECTORS, TEXT_PATTERNS, TIMING, RETRY_LIMITS, VIEWPORT, USER_AGENT, BROWSER_ARGS
- **Benefits**: Single source of truth for all configuration values

### browser.js
- **Purpose**: Browser lifecycle management
- **Key Functions**:
  - `launchBrowser()` - Creates configured browser instance
  - `createPage()` - Sets up page with anti-detection measures
  - `setupAntiDetection()` - Configures anti-bot features
  - `setupDialogHandler()` - Handles automatic dialog dismissal

### session.js
- **Purpose**: Session persistence and recovery
- **Key Functions**:
  - `saveSession()` - Saves cookies and storage
  - `loadSession()` - Restores previous session
  - `getStorageData()` - Extracts localStorage/sessionStorage
  - `setStorageData()` - Restores storage data

### login.js
- **Purpose**: Authentication workflow
- **Key Functions**:
  - `login()` - Main login orchestration
  - `enterCredentials()` - Types username/password
  - `attemptLogin()` - Retry logic for login
  - `selectRole()` - Role selection workflow
  - `handleLogout()` - Account conflict resolution

### documents.js
- **Purpose**: Document processing workflow
- **Key Functions**:
  - `navigateToNaskahMasuk()` - Navigation to inbox
  - `processMenusWithBadges()` - Main processing loop
  - `processMenuFlow()` - Single menu processing
  - `processSingleDocument()` - Individual document handling

### pageHelper.js
- **Purpose**: Reusable page interaction utilities
- **Key Functions**:
  - `typeInInput()` - Type text with multiple selector fallback
  - `clickButtonByText()` - Find and click buttons by text
  - `waitForAnySelector()` - Wait for any of multiple selectors
  - `getPageState()` - Get current page information
  - `pageContainsText()` - Check for text patterns

### stats.js
- **Purpose**: Statistics tracking and display
- **Key Functions**:
  - `createStats()` - Initialize statistics object
  - `updateStats()` - Update processing counters
  - `displaySummary()` - Show final results

## 🚀 Usage

### Basic Usage

```bash
npm start
```

### Headless Mode

```bash
npm run headless
```

Or set in `.env`:
```env
HEADLESS=true
```

## ⚙️ Configuration

Edit `.env` file with your credentials:

```env
# Credentials
SIDIA_USERNAME=your_username
SIDIA_PASSWORD=your_password

# Settings
SIDIA_BASE_URL=https://sidia.bpjsketenagakerjaan.go.id
TIMEOUT=30000
RETRY_ATTEMPTS=10
RETRY_DELAY=3000

# Automation
FEEDBACK_MESSAGE=dipedomani dan dilaksanakan
DOCUMENT_TYPES=NKH0002,NKH0001,NKH0016,NKH0017

# Mode
HEADLESS=false
```

## 🔧 Customization

### Adding New Selectors

Edit `constants.js` to add new selectors:

```javascript
const SELECTORS = {
    // ... existing selectors
    customFeature: {
        button: ['button.new-class'],
        input: '#custom-input'
    }
};
```

### Modifying Workflow

Edit `index.js` to change the workflow:

```javascript
async function executeWorkflow(page, stats) {
    await login(page, CONFIG);
    await selectRole(page);
    // Add your custom steps here
    await customStep(page);
    await navigateToNaskahMasuk(page, CONFIG);
}
```

### Adjusting Timing

Edit `constants.js` to modify timing:

```javascript
const TIMING = {
    PAGE_LOAD: 3000,
    YOUR_CUSTOM_DELAY: 5000
};
```

## 🧪 Testing

The modular structure makes testing easier:

```javascript
const { login } = require('./login');
const { createStats } = require('./stats');

// Test individual functions
describe('Login Module', () => {
    it('should handle login', async () => {
        // Test login function
    });
});
```

## 📊 Workflow

The automation follows this sequence:

1. **Launch Browser** - Configure with anti-detection settings
2. **Login** - Enter credentials with retry logic
3. **Select Role** - Choose first available role
4. **Navigate** - Go to Naskah Masuk menu
5. **Process Documents** - For each menu with badges:
   - Click Disposisi tab
   - Click "Lihat" button
   - Wait for feedback section
   - Type feedback message
   - Click "Simpan" button
   - Wait for success box
   - Click "OK" button
   - Click "Kembali" button
   - Repeat until no more badges
6. **Display Summary** - Show processing statistics

## 🔒 Security Features

- **Session Persistence** - Maintains login across runs
- **Anti-Detection** - Mimics real browser behavior
- **Automatic Dialog Handling** - Dismisses alerts automatically
- **Retry Logic** - Handles temporary failures
- **Error Recovery** - Saves session even on errors

## 🛠️ Maintenance

### Adding New Features

1. Create a new module in the appropriate file
2. Export the function
3. Import and use in the main workflow

### Debugging

Each module has detailed logging:

```javascript
console.log(chalk.gray('  → Detailed step information'));
console.log(chalk.green('  ✓ Success messages'));
console.log(chalk.red('  ✗ Error messages'));
console.log(chalk.yellow('  ⚠ Warning messages'));
```

## 📝 Notes

- The refactored code maintains all original functionality
- All selectors and timing values are centralized
- Error handling is consistent across modules
- The code is now easier to maintain and extend
- Each module can be tested independently

## 🤝 Contributing

When adding features:

1. Keep modules focused on single responsibility
2. Add JSDoc comments for all functions
3. Use consistent error handling patterns
4. Update this README with new capabilities
5. Test changes thoroughly before committing

## 📄 License

This automation is for personal use with the SIDIA system.