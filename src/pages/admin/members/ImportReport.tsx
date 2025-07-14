import { Table, Text, Button, Title } from "@mantine/core";
import { ImportReportType } from "../../../services/types";

interface Props {
  report: ImportReportType;
  onClear: () => void;
}

export default function ImportReport({ report, onClear }: Props) {
  return (
    <div style={{ marginBottom: 24 }}>
      <Title order={4} mb="sm">
        Informe de importación masiva
      </Title>
      <Text>
        Usuarios <b>creados</b>: {report.created.length} <br />
        Usuarios <b>actualizados</b>: {report.updated.length} <br />
        Usuarios <b>con error</b>: {report.errors.length}
      </Text>
      <Button variant="subtle" color="red" mt="sm" onClick={onClear}>
        Limpiar informe
      </Button>

      {report.created.length > 0 && (
        <>
          <Text mt="md" mb="xs" c="green">
            Creados:
          </Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fila</Table.Th>
                <Table.Th>Datos</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {report.created.map((item, idx) => (
                <Table.Tr key={idx}>
                  <Table.Td>{item.row}</Table.Td>
                  <Table.Td>
                    <pre
                      style={{ fontSize: 10, maxWidth: 300, overflow: "auto" }}
                    >
                      {JSON.stringify(item.data, null, 2)}
                    </pre>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}

      {report.updated.length > 0 && (
        <>
          <Text mt="md" mb="xs" c="yellow">
            Actualizados:
          </Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fila</Table.Th>
                <Table.Th>Datos</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {report.updated.map((item, idx) => (
                <Table.Tr key={idx}>
                  <Table.Td>{item.row}</Table.Td>
                  <Table.Td>
                    <pre
                      style={{ fontSize: 10, maxWidth: 300, overflow: "auto" }}
                    >
                      {JSON.stringify(item.data, null, 2)}
                    </pre>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}

      {report.errors.length > 0 && (
        <>
          <Text mt="md" mb="xs" c="red">
            Errores:
          </Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fila</Table.Th>
                <Table.Th>Error</Table.Th>
                <Table.Th>Datos</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {report.errors.map((err, idx) => (
                <Table.Tr key={idx}>
                  <Table.Td>{err.row}</Table.Td>
                  <Table.Td>{err.error}</Table.Td>
                  <Table.Td>
                    <pre
                      style={{ fontSize: 10, maxWidth: 300, overflow: "auto" }}
                    >
                      {JSON.stringify(err.data, null, 2)}
                    </pre>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}
    </div>
  );
}
