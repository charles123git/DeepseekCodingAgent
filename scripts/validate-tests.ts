import { TestValidator } from "../server/utils/test-validator";
import { MVP_TEST_REQUIREMENTS } from "../shared/test-rubric";
import { afterAll, type TaskResult } from "vitest";

let validator: TestValidator;
let testResults: TaskResult[] = [];

// Initialize validator
validator = new TestValidator();

// Collect test results during test execution
afterAll((suite) => {
  console.log('\nValidating MVP Test Requirements...\n');

  // Extract test results from the suite
  const collectResults = (suite: any): TaskResult[] => {
    const results: TaskResult[] = [];
    if (suite.tasks) {
      results.push(...suite.tasks);
    }
    if (suite.suites) {
      for (const childSuite of suite.suites) {
        results.push(...collectResults(childSuite));
      }
    }
    return results;
  };

  testResults = collectResults(suite);

  for (const feature of MVP_TEST_REQUIREMENTS) {
    const results = validator.validateTestResults(testResults, feature);
    console.log(validator.generateReport());
  }

  if (!validator.hasPassedAllRequirements()) {
    console.error('\n❌ Test coverage does not meet MVP requirements');
    process.exit(1);
  }

  console.log('\n✅ All MVP test requirements met!');
});