import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml'
import chalk from 'chalk';
import * as Process from '../utils/process';
import { Status } from '../utils/task';
import { ProviderName } from '../providers/provider';
import { ReadonlyArray, Option, OptionValue } from '../utils/types';

const fileName = '.changelog.yaml';
const load = (p: string): ConfigOptions => yaml.safeLoad(fs.readFileSync(p, 'utf8')) || {};
const defaultConfig: ConfigOptions = load(path.join(__dirname, '../../', fileName));

export interface ConfigOptions extends Option {
    config?: string;
    types?: string[];
    plugins?: string[];
    provider?: ProviderName;
    [key: string]: Option | OptionValue;
}

export default class Config {
    public readonly plugins: ReadonlyArray<string> = defaultConfig.plugins || [];
    public readonly types: ReadonlyArray<string>;
    public readonly options: Option;
    public readonly provider: ProviderName;

    public constructor(options?: ConfigOptions) {
        const task = Process.Instance.addTask('Config initializing');

        let config: ConfigOptions = Object.assign({}, defaultConfig, options || {});
        let { config: filePath } = config;

        if (typeof filePath === 'string') {
            filePath = path.resolve(process.cwd(), filePath);

            if (typeof filePath === 'string' && filePath.length && fs.existsSync(filePath)) {
                config = Object.assign({}, config, load(filePath));

                task.subtask(`Used config file from: ${filePath}`, Status.Skipped);
            } else {
                task.subtask(`File ${chalk.bold(fileName)} is not exists`, Status.Skipped);
            }
        } else {
            task.subtask(`File path to ${chalk.bold(fileName)} is not specified`, Status.Skipped);
            task.subtask(`Used default config`, Status.Completed);
        }

        this.provider = config.provider || ProviderName.GitHub;
        this.types = config.types || [];
        this.plugins = this.plugins.concat(config.plugins || []);
        this.options = new Proxy(config as Option, {
            get(target, name, receiver): Option | undefined {
                return Reflect.get(target, name, receiver);
            }
        });

        if (task) task.complete();
    }
}
