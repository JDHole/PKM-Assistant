import test from 'ava';
import { parseWorkflowCore, formatWorkflowForPromptCore } from './workflowParserCore.js';

// Simple mock for yaml parser since we don't want to depend on obsidian or js-yaml in tests optionally
// We only need to support the keys we expect: name, trigger, description
function mockParseYaml(yamlStr) {
    const result = {};
    const lines = yamlStr.split('\n');
    for (const line of lines) {
        const [key, ...values] = line.split(':');
        if (key && values.length) {
            result[key.trim()] = values.join(':').trim();
        }
    }
    return result;
}

test('parseWorkflowCore parses valid file with frontmatter', t => {
    const content = `---
name: Test Workflow
trigger: test
description: A test workflow
---
## Step 1
Do something.`;

    const result = parseWorkflowCore(content, mockParseYaml);

    t.is(result.name, 'Test Workflow');
    t.is(result.trigger, 'test');
    t.is(result.description, 'A test workflow');
    t.is(result.content, '## Step 1\nDo something.');
});

test('parseWorkflowCore handles missing frontmatter', t => {
    const content = `Just some content`;
    const result = parseWorkflowCore(content, mockParseYaml);

    t.is(result.name, '');
    t.is(result.content, 'Just some content');
});

test('parseWorkflowCore handles empty content', t => {
    const result = parseWorkflowCore(null, mockParseYaml);
    t.is(result.name, '');
    t.is(result.content, '');
});

test('formatWorkflowForPromptCore formats correctly', t => {
    const workflow = {
        name: 'My Workflow',
        description: 'Desc',
        content: 'Steps...'
    };
    const result = formatWorkflowForPromptCore(workflow);
    const expected = `## Workflow: My Workflow
Desc
Steps...`;

    t.is(result, expected);
});
