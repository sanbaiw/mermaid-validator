let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  const request = JSON.parse(input);
  process.stdout.write(JSON.stringify(request.fixtures.map((fixture) => ({
    fixtureId: fixture.id,
    engine: request.engine,
    engineVersion: "test-version",
    verdict: "engine-error",
    errorFamily: "initialization-error",
    message: "Synthetic initialization failure",
    diagramType: fixture.diagramType,
    locationPrecision: "document",
  }))));
});
