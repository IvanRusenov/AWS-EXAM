import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {AwsRegularExamStack} from "../lib/aws-regular-exam-stack";

test("Snapshot", () => {
    const app = new App();
    const stack = new AwsRegularExamStack(app,"testStack");
    const template = Template.fromStack(stack);

    expect(template).toMatchSnapshot();
});
