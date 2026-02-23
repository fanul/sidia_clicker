# SIDIA Automation - Node.js Implementation

A modern Node.js implementation of the SIDIA (BPJS Ketenagakerjaan) document processing automation system, originally built with TagUI.

## 🚀 Features

- ✅ Automated login to SIDIA system
- ✅ Document queue navigation
- ✅ Batch processing of multiple document types
- ✅ Automatic feedback insertion
- ✅ Comprehensive retry logic
- ✅ Detailed progress logging
- ✅ Headless browser support
- ✅ Environment-based configuration

## 📦 Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**

## 🛠️ Installation

1. **Clone or download this project**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file with your credentials:**
   ```env
   SIDIA_USERNAME=your_actual_username
   SIDIA_PASSWORD=your_actual_password
   ```

## 🎯 Usage

### Standard Mode (Visible Browser)
```bash
npm start
```

### Headless Mode (Background)
```bash
npm run headless
```

### Debug Mode
```bash
npm run debug
```

## ⚙️ Configuration

All configuration is done through the `.env` file:

```env
# SIDIA System Credentials
SIDIA_USERNAME=your_username
SIDIA_PASSWORD=your_password

# SIDIA System URL
SIDIA_BASE_URL=https://sidia.bpjsketenagakerjaan.go.id

# Automation Settings
TIMEOUT=30000              # Element timeout in milliseconds
RETRY_ATTEMPTS=10          # Number of retry attempts
RETRY_DELAY=3000           # Delay between retries (ms)
HEADLESS=false             # Run in headless mode

# Feedback Message
FEEDBACK_MESSAGE=dipedomani dan dilaksanakan

# Document Types to Process
DOCUMENT_TYPES=NKH0002,NKH0001,NKH0016,NKH0017
```

### Document Type Codes

- **NKH0002** - Memo Eksternal
- **NKH0001** - Memo Internal
- **NKH0016** - Surat Biasa
- **NKH0017** - Surat Rahasia

## 📁 Project Structure

```
sidia-clicker/
├── index.js              # Main automation script
├── utils.js              # Utility functions
├── package.json          # Node.js dependencies
├── .env.example          # Environment configuration template
├── .env                  # Your actual configuration (not in git)
└── README_NODEJS.md      # This file
```

## 🔧 How It Works

### Workflow Overview

1. **Login Phase**
   - Navigates to SIDIA login page
   - Enters credentials from `.env`
   - Handles multiple login button patterns

2. **Navigation Phase**
   - Locates and clicks "Naskah Masuk" menu
   - Retries up to 10 times with 3-second delays

3. **Document Count Phase**
   - Reads badge counts for each document type
   - Displays summary of pending documents

4. **Processing Phase**
   - For each document type with pending items:
     - Clicks the category menu
     - Switches to "Disposisi" tab
     - Processes each document:
       - Clicks action button
       - Opens feedback form
       - Inserts configured message
       - Saves and confirms
       - Returns to list

5. **Summary Phase**
   - Displays total documents processed
   - Shows breakdown by type
   - Reports completion timestamp

### Key Features

#### Retry Logic
Every critical operation uses intelligent retry logic:
```javascript
await retry(async () => {
    // Your operation here
}, {
    attempts: 10,
    delay: 3000,
    context: 'operation description'
});
```

#### Multi-Pattern Selectors
The system tries multiple selector patterns:
```javascript
const selectors = [
    'input[id="input-15"]',
    'input[name="username"]',
    'input[type="text"]'
];
```

#### Safe Operations
All interactions use safe wrappers that handle failures gracefully.

## 🎨 Customization

### Adding New Document Types

1. **Add to DOCUMENT_TYPE_INFO in index.js:**
   ```javascript
   const DOCUMENT_TYPE_INFO = {
       // ... existing types
       'NKH0003': {
           name: 'Your New Type',
           selector: '//a[@href="/inbox?f=NKH0003"]'
       }
   };
   ```

2. **Add to .env:**
   ```env
   DOCUMENT_TYPES=NKH0002,NKH0001,NKH0016,NKH0017,NKH0003
   ```

### Modifying Selectors

Update the `SELECTORS` object in [index.js](index.js):

```javascript
const SELECTORS = {
    usernameInput: [
        'input[id="your-new-id"]',
        'input[name="your-name"]'
    ],
    // ... other selectors
};
```

### Changing Feedback Message

Update in `.env`:
```env
FEEDBACK_MESSAGE=Your custom feedback here
```

## 🔍 Troubleshooting

### Common Issues

#### "Cannot find username input field"
- **Cause:** SIDIA login page structure changed
- **Solution:** Update `SELECTORS.usernameInput` with correct selectors

#### "Naskah Masuk menu not found"
- **Cause:** Menu structure changed or page not loaded
- **Solutions:**
  - Increase `TIMEOUT` in `.env`
  - Increase `RETRY_ATTEMPTS`
  - Update `SELECTORS.naskahMasuk`

#### "Documents not being processed"
- **Cause:** Selector patterns don't match current UI
- **Solution:** Run in debug mode, inspect elements, update selectors

### Debug Mode

Run in visible mode to see what's happening:
```bash
npm start
```

Add console logging for debugging:
```javascript
console.log(chalk.yellow('Debug: Current value:', variable));
```

### Finding Selectors

1. Run the script in visible mode
2. Open Chrome DevTools (F12)
3. Use the element inspector
4. Right-click → Copy → Copy selector
5. Update the SELECTORS object

## 📚 Best Practices

1. **Always use `.env` for credentials**
   - Never hardcode passwords
   - Add `.env` to `.gitignore`

2. **Test incrementally**
   - Test login first
   - Then navigation
   - Then single document
   - Finally full automation

3. **Monitor first runs**
   - Run in visible mode initially
   - Watch for unexpected popups
   - Verify all actions complete

4. **Keep dependencies updated**
   ```bash
   npm update
   ```

5. **Handle UI changes**
   - SIDIA may update their interface
   - Keep selectors up to date
   - Test thoroughly after changes

## 🔒 Security Notes

- **Never commit `.env` file** to version control
- **Use strong, unique passwords**
- **Rotate credentials regularly**
- **Run in headless mode only after testing**
- **Monitor execution logs for anomalies**

## 📈 Performance Tips

1. **Adjust timeouts** based on your network speed
2. **Use headless mode** for faster execution
3. **Process during off-peak hours** for better system response
4. **Monitor system resources** during long runs

## 🔄 Maintenance

### Regular Tasks

**Weekly:**
- Test login functionality
- Verify all selectors work
- Check for SIDIA UI updates

**Monthly:**
- Update dependencies
- Review error logs
- Optimize timeout settings

**After SIDIA Updates:**
1. Test in visible mode
2. Update broken selectors
3. Verify all document types
4. Update documentation

## 🆚 TagUI vs Node.js

| Feature | TagUI | Node.js |
|---------|-------|---------|
| Setup | TagUI installation required | npm install only |
| Language | TagUI script | JavaScript/Node.js |
| Browser | PhantomJS/Chrome | Puppeteer/Chrome |
| Debugging | Limited | Full Chrome DevTools |
| Error Handling | Basic try-catch | Comprehensive async/await |
| Logging | echo statements | chalk + structured logging |
| Maintenance | .tag files | Standard Node.js |
| Community | Smaller | Larger Node.js ecosystem |

## 📞 Getting Help

### Resources
- **Puppeteer Documentation:** https://pptr.dev
- **Node.js Documentation:** https://nodejs.org/docs
- **Chrome DevTools Protocol:** https://chromedevtools.github.io/devtools-protocol/

### When Stuck
1. Check this README's troubleshooting section
2. Run in visible mode to observe
3. Add debug logging
4. Test selectors in browser console
5. Check SIDIA system status

## 📝 Changelog

### Version 1.0.0
- ✅ Initial Node.js implementation
- ✅ Puppeteer-based automation
- ✅ Environment configuration
- ✅ Comprehensive retry logic
- ✅ Detailed progress logging
- ✅ Support for all document types
- ✅ Headless mode support

### Future Enhancements
- [ ] Web dashboard for monitoring
- [ ] Database logging of processed documents
- [ ] Email notifications on completion
- [ ] Parallel processing of document types
- [ ] Screenshot capture on errors
- [ ] Configuration file validation

## ✅ Pre-Flight Checklist

Before running:
- [ ] Node.js installed (v14+)
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] Credentials verified correct
- [ ] Test with visible mode first
- [ ] Verify SIDIA system is accessible
- [ ] Check network connection

## 🎓 Learning Resources

### Puppeteer Basics
```javascript
// Navigate to page
await page.goto('https://example.com');

// Click element
await page.click('#button-id');

// Type text
await page.type('#input-id', 'text');

// Wait for element
await page.waitForSelector('#element-id');

// Read text
const text = await page.$eval('#el', el => el.textContent);
```

### Async/Await Pattern
```javascript
async function main() {
    try {
        await step1();
        await step2();
        await step3();
    } catch (error) {
        console.error(error);
    }
}
```

## 📄 License

MIT License - Feel free to modify and distribute

---

**Last Updated:** 2025-01-XX
**Version:** 1.0.0
**Maintainer:** Your Name

**Note:** This is a complete rewrite of the TagUI version, providing better error handling, modern JavaScript features, and easier maintenance.
