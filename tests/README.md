# S4WN Tests

The project uses Jest for unit testing and Playwright for UI/Integration testing.

## Test Categories

- **Unit tests**: Individual modules and functions (Jest)
- **UI tests**: Full page interactions and visual regression (Playwright)

## Running Tests

```bash
npm test              # Run unit tests
npm run test:ui       # Run UI tests
./tests/run_tests.sh  # Run full pipeline (Typecheck + UI tests)
```
