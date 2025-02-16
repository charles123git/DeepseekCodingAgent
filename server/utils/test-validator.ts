import { MVPFeature, MVP_TEST_REQUIREMENTS } from "@shared/test-rubric";
import type { TaskResult } from "vitest";

interface TestValidationResult {
  feature: string;
  criteria: string;
  passed: boolean;
  coverage: number;
  missingTestTypes: string[];
  priority: string;
  dependencies: string[];
  dependenciesMet: boolean;
}

export class TestValidator {
  private results: TestValidationResult[] = [];
  private completedTests = new Set<string>();

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

      // Check if all dependencies are met
      const dependenciesMet = criterion.dependencies.every(dep => 
        this.completedTests.has(dep)
      );

      const passed = coverage >= criterion.minimumCoverage && 
                     missingTestTypes.length === 0 && 
                     dependenciesMet;

      if (passed) {
        this.completedTests.add(criterion.description);
      }

      results.push({
        feature: feature.name,
        criteria: criterion.description,
        passed,
        coverage,
        missingTestTypes,
        priority: criterion.priority,
        dependencies: criterion.dependencies,
        dependenciesMet
      });
    }

    this.results = results;
    return results;
  }

  generateReport(): string {
    let report = "MVP Test Coverage Report\n";
    report += "=======================\n\n";

    // Group results by priority
    const priorityGroups = {
      critical: this.results.filter(r => r.priority === 'critical'),
      high: this.results.filter(r => r.priority === 'high'),
      medium: this.results.filter(r => r.priority === 'medium'),
      low: this.results.filter(r => r.priority === 'low')
    };

    for (const [priority, results] of Object.entries(priorityGroups)) {
      if (results.length > 0) {
        report += `${priority.toUpperCase()} Priority Tests\n`;
        report += "-------------------\n";

        for (const result of results) {
          report += `Feature: ${result.feature}\n`;
          report += `Criterion: ${result.criteria}\n`;
          report += `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
          report += `Coverage: ${result.coverage.toFixed(1)}%\n`;

          if (result.missingTestTypes.length > 0) {
            report += `Missing Test Types: ${result.missingTestTypes.join(', ')}\n`;
          }

          if (!result.dependenciesMet) {
            report += `⚠️ Dependencies not met: ${result.dependencies.join(', ')}\n`;
          }

          report += "\n";
        }
      }
    }

    const criticalPassed = priorityGroups.critical.every(r => r.passed);
    report += "\nSummary\n-------\n";
    report += `Critical Tests: ${criticalPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}\n`;

    return report;
  }

  hasPassedAllRequirements(): boolean {
    return this.results.every(result => result.passed);
  }

  hasPassedCriticalRequirements(): boolean {
    return this.results
      .filter(result => result.priority === 'critical')
      .every(result => result.passed);
  }
}