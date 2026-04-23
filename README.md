# PP Cattle P/L Model

## Shared basis data workflow

This version reads monthly PP basis data from:

`data/pp_basis_monthly.csv`

### Required CSV format

```csv
Month,Steers,Heifers
1,39.46,18.88
2,42.10,39.16
...
12,57.77,37.84
```

### How to update for all users

1. Replace `data/pp_basis_monthly.csv` in the repo.
2. Commit the change.
3. Redeploy or let your host auto-deploy.

All users will then pull the updated file.

## Current modeling logic

- User enters Tuls 325# steer cash price.
- Heifer buy price is automatically $15/cwt lower.
- Base outgoing basis = overall PP average from CSV + seasonal shift for projected out month.
- Risk floor, conservative, and bullish are basis adjustments around base.
- Interest uses the breakeven-style average capital formula.
- Outputs include P/L, ROE, annualized ROE, and IRR for steer, heifer, and mixed paths.
