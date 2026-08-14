import * as net from 'node:net';
import type { CustomerRemoteAccessPort } from '@gigahub/application-customer';

export class TcpCustomerRemoteAccessAdapter implements CustomerRemoteAccessPort {
  async checkPorts(
    ip: string,
    ports: readonly number[],
    timeoutMs: number,
  ): Promise<Array<{ port: number; isOpen: boolean }>> {
    return Promise.all(
      ports.map(async (port) => ({
        port,
        isOpen: await this.checkPort(ip, port, timeoutMs),
      })),
    );
  }

  private checkPort(ip: string, port: number, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;

      const finish = (isOpen: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        socket.destroy();
        resolve(isOpen);
      };

      socket.setTimeout(timeoutMs);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));
      socket.connect(port, ip);
    });
  }
}
