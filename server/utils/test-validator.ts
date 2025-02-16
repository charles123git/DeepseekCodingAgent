import { MVPFeature, MVP_TEST_REQUIREMENTS } from "@shared/test-rubric";
import type { TaskResult } from "vitest";

interface TestValidationResult {
  feature: string;
  criteria: string;
  passed: boolean;
  coverage: number;
  missingTestTypes: string[];
}

export class TestValidator {
  private results: TestValidationResult[] = [];

  validateTestResults(testResults: TaskResult[], feature: MVPFeature) {
    const results: TestValidationResult[] = [];

    for (const criterion of feature.criteria) {
      // Filter tests relevant to this criterion
      const relevantTests = testResults.filter(test =>
        test.name.toLowerCase().includes(feature.name.toLowerCase()) &&
        test.name.toLowerCase().includes(criterion.description.toLowerCase())
      );

      // Calculate coverage
      const totalTests = relevantTests.length;
      const passedTests = relevantTests.filter(test => test.state === 'passed').length;
      const coverage = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

      // Check which test types are missing
      const implementedTestTypes = new Set(
        relevantTests.map(test =>
          test.name.toLowerCase().includes('unit') ? 'unit' :
          test.name.toLowerCase().includes('integration') ? 'integration' : 'e2e'
        )
      );

      const missingTestTypes = criterion.testTypes.filter(
        type => !implementedTestTypes.has(type)
      );

      results.push({
        feature: feature.name,
        criteria: criterion.description,
        passed: coverage >= criterion.minimumCoverage && missingTestTypes.length === 0,
        coverage,
        missingTestTypes
      });
    }

    this.results = results;
    return results;
  }

  generateReport(): string {
    let report = "MVP Test Coverage Report\n";
    report += "=======================\n\n";

    for (const result of this.results) {
      report += `Feature: ${result.feature}\n`;
      report += `Criterion: ${result.criteria}\n`;
      report += `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      report += `Coverage: ${result.coverage.toFixed(1)}%\n`;

      if (result.missingTestTypes.length > 0) {
        report += `Missing Test Types: ${result.missingTestTypes.join(', ')}\n`;
      }

      report += "\n";
    }

    return report;
  }

  hasPassedAllRequirements(): boolean {
    return this.results.every(result => result.passed);
  }
}