import { useEffect, useState } from "react";
import {
  Table,
  Loader,
  Center,
  Text,
  Paper,
  Group,
  Pagination,
  TextInput,
  Badge,
} from "@mantine/core";
import { fetchAllUsers } from "../../../services/userService";
import { fetchOrganizationUserByUserId } from "../../../services/organizationUserService";
import { fetchOrganizations } from "../../../services/organizationService";
import { User, OrganizationUser, Organization } from "../../../services/types";

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [usersWithOrg, setUsersWithOrg] = useState<
    (User & { organizationUser: OrganizationUser | null })[]
  >([]);
  const [organizations, setOrganizations] = useState<
    Record<string, Organization>
  >({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(15);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Traer todos los users y todas las organizaciones
        let allUsers = await fetchAllUsers();
        const orgs = await fetchOrganizations();

        // Map de orgs por id
        const orgMap: Record<string, Organization> = {};
        for (const org of orgs) orgMap[org._id] = org;
        setOrganizations(orgMap);

        // Filtrar si hay búsqueda
        if (search) {
          const q = search.toLowerCase();
          allUsers = allUsers.filter(
            (u) =>
              (u.email && u.email.toLowerCase().includes(q)) ||
              (u.names && u.names.toLowerCase().includes(q))
          );
        }

        // Paginación manual
        const start = (currentPage - 1) * perPage;
        const pagedUsers = allUsers.slice(start, start + perPage);

        // Cargar organizationUser de cada uno (en paralelo)
        const withOrg = await Promise.all(
          pagedUsers.map(async (user) => {
            let orgUser: OrganizationUser | null = null;
            try {
              orgUser = await fetchOrganizationUserByUserId(user._id);
            } catch {
              // Puede que no exista orgUser para algunos users
            }
            return { ...user, organizationUser: orgUser };
          })
        );
        setUsersWithOrg(withOrg);
        setUsers(allUsers);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [search, currentPage, perPage]);

  return (
    <Paper shadow="sm" p="lg">
      <Group justify="space-between" mb="md">
        <Text fw={700} fz="xl">
          Usuarios registrados
        </Text>
        <TextInput
          placeholder="Buscar por email o nombre"
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setCurrentPage(1);
          }}
          w={300}
        />
      </Group>
      {loading ? (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      ) : usersWithOrg.length === 0 ? (
        <Center py="xl">
          <Text c="gray">No hay usuarios para mostrar.</Text>
        </Center>
      ) : (
        <>
          <Table striped highlightOnHover withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Email</Table.Th>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Teléfono</Table.Th>
                <Table.Th>Organización</Table.Th>
                <Table.Th>Asignado a Organización</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {usersWithOrg.map((user) => {
                // Obtener el id de organización (puede ser string o {_id: string})
                const orgId = user.organizationUser?.organization_id;
                // Buscar el nombre de la organización
                const orgName = orgId && organizations[orgId]?.name;

                return (
                  <Table.Tr key={user._id}>
                    <Table.Td>{user.email}</Table.Td>
                    <Table.Td>
                      {user.names ||
                        user.organizationUser?.properties?.names ||
                        "-"}
                    </Table.Td>
                    <Table.Td>
                      {user.organizationUser?.properties?.phone || "-"}
                    </Table.Td>
                    <Table.Td>{orgName || "-"}</Table.Td>
                    <Table.Td>
                      {user.organizationUser ? (
                        <Badge color="teal" variant="filled">
                          ✔
                        </Badge>
                      ) : (
                        <Badge color="gray" variant="light">
                          —
                        </Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
          <Group mt="md" justify="center">
            <Pagination
              total={Math.ceil(users.length / perPage)}
              value={currentPage}
              onChange={setCurrentPage}
            />
          </Group>
        </>
      )}
    </Paper>
  );
}
