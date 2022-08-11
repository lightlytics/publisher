import got from "got";
import fs from "fs";
import path from "path";
import {localsScanner} from "./scanners/locals_scanner.js";
import {providersScanner} from "./scanners/providers_scanner.js";
import {policiesScanner} from "./scanners/policies_scanner.js";
import * as constants from "./constants.js";

export async function publish({
                                apiUrl,
                                tfWorkingDir,
                                tfPlan,
                                tfGraph,
                                collectionToken,
                                metadata,
                              }) {
  const workingDir = tfWorkingDir.replace(/\/$/, "");

  const modulesPath = path.normalize(
    `${workingDir}/.terraform/modules/modules.json`
  );
  let modules = {};
  if (fs.existsSync(modulesPath)) {
    modules = JSON.parse(fs.readFileSync(modulesPath, "utf8"));
  }
  const parsedHcl = {};

  if (!modules.Modules) modules["Modules"] = [];

  modules["Modules"].push({
    Key: "root_module",
    Source: "root_module",
    Dir: "./",
  });

  modules.Modules.filter((module) => module.Key && module.Dir && module.Source)
    .filter((module) =>
      fs.existsSync(path.normalize(`${workingDir}/${module.Dir}`))
    )
    .forEach((module) => {
      fs.readdirSync(path.normalize(`${workingDir}/${module.Dir}`)).forEach(
        (fileName) => {
          const fileExtension = path.parse(fileName).ext;
          if (fileExtension !== ".tf") return;

          const filePath = `${workingDir}/${module.Dir}/${fileName}`;
          const moduleContent = fs.readFileSync(filePath, "utf8");

          function addData(HclArg, type) {
            function innerAddData(data) {
              if (!parsedHcl[HclArg]) {
                parsedHcl[HclArg] = {};
              }
              if (!parsedHcl[HclArg][module.Source]) {
                switch (type) {
                  case "object":
                    parsedHcl[HclArg][module.Source] = {};
                    break;
                  case "array":
                    parsedHcl[HclArg][module.Source] = [];
                    break;
                }
              }

              switch (type) {
                case "object":
                  parsedHcl[HclArg][module.Source] = {
                    ...parsedHcl[HclArg][module.Source],
                    ...data,
                  };
                  break;
                case "array":
                  parsedHcl[HclArg][module.Source].push(data);
                  break;
              }
            }

            return innerAddData;
          }

          const localsProcessor = localsScanner(addData("locals", "array"));
          const providersProcessor = providersScanner(
            addData("providers", "object")
          );
          const policiesProcessor = policiesScanner(
            addData("policies", "object")
          );

          moduleContent.split("\n").forEach((line, index, {length}) => {
            // ignore comments
            const sanitizedLine = String(line).trim();
            if (sanitizedLine.startsWith("#")) return;
            if (sanitizedLine.startsWith("//")) return;

            if (index + 1 < length) {
              line += "\n"
            }

            localsProcessor(line);
            providersProcessor(line);
            policiesProcessor(line);
          });
        }
      );
    });

  const plan = JSON.parse(fs.readFileSync(tfPlan, "utf8"));
  removeAwsCredentials(plan);
  let graph;
  if (tfGraph) {
    graph = fs.readFileSync(tfGraph, "utf8");
  }

  const publishUrl = `https://${apiUrl}${constants.PublishEndpoint}`;
  const headers = {
    [constants.LightlyticsTokenKey]: collectionToken,
  };

  const data = {
    parsed_hcl: parsedHcl,
    plan,
    graph,
    metadata,
  };

  const response = await got.post(publishUrl, {
    json: data,
    responseType: "json",
    headers,
  });

  const eventId = response.body.eventId;
  const customerId = response.body.customerId;

  return {eventId, customerId};
}

function removeAwsCredentials(plan) {
  if (
    plan &&
    plan.configuration &&
    plan.configuration.provider_config &&
    plan.configuration.provider_config.aws &&
    plan.configuration.provider_config.aws.expressions
  ) {
    delete plan["configuration"]["provider_config"]["aws"]["expressions"][
      "access_key"
      ];
    delete plan["configuration"]["provider_config"]["aws"]["expressions"][
      "secret_key"
      ];
  }
}
