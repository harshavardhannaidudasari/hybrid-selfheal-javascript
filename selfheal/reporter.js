'use strict';

const fs = require('fs');
const path = require('path');
const { HTML_TEMPLATE } = require('./reportTemplate');

const PROJECT_NAME = 'hybrid-selfheal-javascript';

function reportDir() {
  return path.join(process.cwd(), 'report');
}

function screenshotsDir() {
  return path.join(reportDir(), 'screenshots');
}

class SelfHealReporter {
  constructor() {
    this.tests = [];
    this.startTime = null;
    this.baseUrl = '';
  }

  onBegin(config, _suite) {
    this.startTime = new Date();

    // Clear + recreate report/screenshots/ so stale PNGs from previous
    // runs don't linger.
    const shots = screenshotsDir();
    fs.rmSync(shots, { recursive: true, force: true });
    fs.mkdirSync(shots, { recursive: true });

    const project = config.projects && config.projects[0];
    this.baseUrl = (project && project.use && project.use.baseURL) || '';
  }

  onTestEnd(test, result) {
    let healingEvents = [];
    const attachment = (result.attachments || []).find((a) => a.name === 'healing-events');
    if (attachment && attachment.body) {
      try {
        healingEvents = JSON.parse(attachment.body.toString('utf-8'));
      } catch (_err) {
        healingEvents = [];
      }
    }

    this.tests.push({
      name: test.title,
      status: result.status,
      healingEvents,
    });
  }

  onEnd(_result) {
    const finishedAt = new Date();
    const durationSeconds = (finishedAt.getTime() - this.startTime.getTime()) / 1000;

    const data = {
      run: {
        project: PROJECT_NAME,
        baseUrl: this.baseUrl,
        startedAt: this.startTime.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationSeconds: Math.round(durationSeconds * 100) / 100,
      },
      tests: this.tests,
    };

    const dir = reportDir();
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(
      path.join(dir, 'healing-report.json'),
      JSON.stringify(data, null, 2),
      'utf-8'
    );

    const html = HTML_TEMPLATE
      .replace(/__PROJECT_NAME__/g, PROJECT_NAME)
      .replace(/__BASE_URL__/g, data.run.baseUrl)
      .replace(/__STARTED_AT__/g, data.run.startedAt)
      .replace(/__DURATION__/g, `${data.run.durationSeconds}s`)
      .replace('__REPORT_DATA_JSON__', JSON.stringify(data));

    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8');
  }
}

module.exports = SelfHealReporter;
