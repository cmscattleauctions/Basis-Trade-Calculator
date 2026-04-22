PP Cattle P/L Model

Files:
- index.html
- styles.css
- app.js

How to use:
1. Open index.html in any modern browser.
2. Enter the Tuls 325# steer buy price and delivery date.
3. Enter feeder and live futures estimates.
4. Review steer, heifer, and mixed outputs.
5. Adjust advanced settings as needed.

Core logic:
- Heifer buy price = steer buy price - $15/cwt
- 1% death loss default
- 2% commission deducted from PP sale side only
- Interest formula mirrors the uploaded breakeven sheet:
  interest/hd = ((purchase cost/hd + 0.5 * (feed cost/hd + dead cost/hd)) * interest rate / 365) * days on feed
- Base basis mode = overall PP basis average + TCFA seasonal month shift

Notes:
- The feeder-driven output is the primary economics view.
- The live output is a shadow check only.
- No server is required.
