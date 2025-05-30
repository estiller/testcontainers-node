import { AbstractStartedContainer, GenericContainer, Wait, type StartedTestContainer } from "testcontainers";

const CASSANDRA_PORT = 9042;

export class CassandraContainer extends GenericContainer {
  private dc = "dc1";
  private rack = "rack1";
  private username = "cassandra";
  private password = "cassandra";

  constructor(image = "cassandra:5.0.2") {
    super(image);
    this.withExposedPorts(CASSANDRA_PORT).withWaitStrategy(Wait.forHealthCheck()).withStartupTimeout(120_000);
  }

  public withDatacenter(dc: string): this {
    this.dc = dc;
    return this;
  }

  public withRack(rack: string): this {
    this.rack = rack;
    return this;
  }

  public withUsername(username: string): this {
    this.username = username;
    return this;
  }

  public withPassword(password: string): this {
    this.password = password;
    return this;
  }

  public override async start(): Promise<StartedCassandraContainer> {
    this.withEnvironment({
      CASSANDRA_DC: this.dc,
      CASSANDRA_RACK: this.rack,
      CASSANDRA_LISTEN_ADDRESS: "auto",
      CASSANDRA_BROADCAST_ADDRESS: "auto",
      CASSANDRA_RPC_ADDRESS: "0.0.0.0",
      CASSANDRA_USERNAME: this.username,
      CASSANDRA_PASSWORD: this.password,
      CASSANDRA_SNITCH: "GossipingPropertyFileSnitch",
      CASSANDRA_ENDPOINT_SNITCH: "GossipingPropertyFileSnitch",
      CASSANDRA_NUM_TOKENS: "1",
      JVM_EXTRA_OPTS: "-Dcassandra.skip_wait_for_gossip_to_settle=0 -Dcassandra.initial_token=0",
    });
    if (!this.healthCheck) {
      this.withHealthCheck({
        test: [
          "CMD-SHELL",
          `cqlsh -u ${this.username} -p ${this.password} -e "SELECT release_version FROM system.local;"`,
        ],
        interval: 250,
        timeout: 1000,
        retries: 1000,
      });
    }
    return new StartedCassandraContainer(await super.start(), this.dc, this.rack, this.username, this.password);
  }
}

export class StartedCassandraContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly dc: string,
    private readonly rack: string,
    private readonly username: string,
    private readonly password: string
  ) {
    super(startedTestContainer);
  }

  public getPort(): number {
    return this.startedTestContainer.getMappedPort(CASSANDRA_PORT);
  }

  public getDatacenter(): string {
    return this.dc;
  }

  public getRack(): string {
    return this.rack;
  }

  public getUsername(): string {
    return this.username;
  }

  public getPassword(): string {
    return this.password;
  }

  public getContactPoint(): string {
    return `${this.getHost()}:${this.getPort()}`;
  }
}
