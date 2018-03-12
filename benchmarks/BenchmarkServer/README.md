## Purpose

This project is to assist in Benchmarking SignalR.
It makes it easier to test local changes than having the App in the Benchmarks repo.

## Usage

1. Push changes you would like to test to a branch on GitHub
2. Clone aspnet/benchmarks repo to your machine or install the global BenchmarksDriver tool https://www.nuget.org/packages/BenchmarksDriver/
3. If cloned go to the BenchmarksDriver project
4. Use the following command as a guideline for running a test using your changes

`dotnet run --clientName signalr --path "/default" --server <server-endpoint> --client <client-endpoint> --properties "Transport=WebSockets" --properties "HubProtocol=messagepack" --connections 10 --duration 20 --warmup 5 --repository signalr@branch-name --projectFile benchmarks/BenchmarkServer/BenchmarkServer.csproj`

5. For more info/commands see https://github.com/aspnet/benchmarks/blob/dev/src/BenchmarksDriver/README.md