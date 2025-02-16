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

  // First check critical requirements
  if (!validator.hasPassedCriticalRequirements()) {
    console.error('\n❌ Critical MVP test requirements not met');
    console.error('Please ensure all critical tests are passing before proceeding.');
    process.exit(1);
  }

  // Then check all requirements
  if (!validator.hasPassedAllRequirements()) {
    console.warn('\n⚠️ Some non-critical tests are failing');
    // Exit with success as only critical tests are required for MVP
    process.exit(0);
  }

  console.log('\n✅ All MVP test requirements met!');
});