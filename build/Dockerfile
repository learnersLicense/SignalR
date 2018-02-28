# Docker image for running the build of this repo

# NOTE: Update to 2.1 when there's a runtime deps package for that. Still, the runtime deps haven't changed so it should be fine
FROM microsoft/dotnet:2.0-runtime-deps

ENV DOTNET_SKIP_FIRST_TIME_EXPERIENCE true

RUN apt-get -yyq update && \
    apt-get -yyq install unzip curl jq gnupg default-jre && \
    rm -rf /var/lib/apt/lists/*

RUN curl -sL https://deb.nodesource.com/setup_8.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*