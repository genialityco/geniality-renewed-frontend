import { useEffect, useMemo, useState } from "react";
import {
	Alert,
	Badge,
	Button,
	Card,
	Group,
	Select,
	Stack,
	Table,
	Text,
	TextInput,
} from "@mantine/core";
import { FaCircleCheck, FaTriangleExclamation } from "react-icons/fa6";
import { fetchEventById, updateEvent } from "../services/eventService";
import {
	CertificateFormat,
	getTemplateFieldsByTemplate,
	TemplateField,
} from "../services/certificateService";

type MappingSource = "userName" | "eventName" | "approvalPercentage";

interface CertificateConfig {
	templateId: string;
	format: CertificateFormat;
	fieldMappings: Record<string, MappingSource>;
}

interface Props {
	eventId: string;
}

const MAPPING_OPTIONS = [
	{ value: "userName", label: "Nombre de usuario" },
	{ value: "eventName", label: "Nombre del evento" },
	{ value: "approvalPercentage", label: "% de aprobación" },
];

export default function CertificateComponent({ eventId }: Props) {
	const [templateId, setTemplateId] = useState("");
	const [format, setFormat] = useState<CertificateFormat>("PDF");
	const [fields, setFields] = useState<TemplateField[]>([]);
	const [mappings, setMappings] = useState<Record<string, MappingSource>>({});
	const [loading, setLoading] = useState(true);
	const [loadingFields, setLoadingFields] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				setLoading(true);
				const event = await fetchEventById(eventId);
				const config = event?.styles?.certificateConfig as
					| CertificateConfig
					| undefined;

				if (!mounted) return;

				if (config?.templateId) {
					setTemplateId(config.templateId);
					setFormat(config.format || "PDF");

					try {
						setLoadingFields(true);
						const templateFields = await getTemplateFieldsByTemplate(
							config.templateId,
						);
						if (!mounted) return;
						setFields(templateFields);

						const restoredMappings: Record<string, MappingSource> = {};
						templateFields.forEach((field) => {
							const current = config.fieldMappings?.[field.name];
							if (
								current === "userName" ||
								current === "eventName" ||
								current === "approvalPercentage"
							) {
								restoredMappings[field.name] = current;
							}
						});
						setMappings(restoredMappings);
					} catch {
						setError(
							"No se pudieron cargar los template-fields guardados para este template.",
						);
					} finally {
						if (mounted) setLoadingFields(false);
					}
				}
			} catch {
				if (mounted) {
					setError("No se pudo cargar la configuración actual del certificado.");
				}
			} finally {
				if (mounted) setLoading(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, [eventId]);

	const missingMappings = useMemo(() => {
		return fields.filter((field) => !mappings[field.name]);
	}, [fields, mappings]);

	const handleLoadTemplateFields = async () => {
		if (!templateId.trim()) {
			setError("Debes ingresar un templateId válido.");
			return;
		}

		try {
			setError(null);
			setSuccess(null);
			setLoadingFields(true);
			const templateFields = await getTemplateFieldsByTemplate(templateId.trim());
			setFields(templateFields);

			setMappings((prev) => {
				const next: Record<string, MappingSource> = {};
				templateFields.forEach((field) => {
					if (prev[field.name]) next[field.name] = prev[field.name];
				});
				return next;
			});

			if (!templateFields.length) {
				setError("Este template no tiene fields configurados en el backend.");
			} else {
				setSuccess(`Se cargaron ${templateFields.length} template-fields.`);
			}
		} catch (e: any) {
			setError(
				e?.response?.data?.message ||
					"No se pudieron obtener los template-fields para ese template.",
			);
			setFields([]);
		} finally {
			setLoadingFields(false);
		}
	};

	const handleSaveConfig = async () => {
		if (!templateId.trim()) {
			setError("Debes ingresar un templateId antes de guardar.");
			return;
		}

		if (!fields.length) {
			setError("Carga primero los template-fields del certificado.");
			return;
		}

		if (missingMappings.length > 0) {
			setError(
				"Debes relacionar todos los template-fields antes de guardar la configuración.",
			);
			return;
		}

		try {
			setSaving(true);
			setError(null);
			setSuccess(null);

			const event = await fetchEventById(eventId);
			const styles = {
				...(event.styles || {}),
				certificateConfig: {
					templateId: templateId.trim(),
					format,
					fieldMappings: mappings,
				},
			};

			await updateEvent(eventId, { styles });
			setSuccess("Configuración de certificado guardada correctamente.");
		} catch (e: any) {
			setError(
				e?.response?.data?.message ||
					"No se pudo guardar la configuración del certificado.",
			);
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return <Text size="sm">Cargando configuración de certificado...</Text>;
	}

	return (
		<Stack gap="md">
			<Text size="sm" c="dimmed">
				Define el template del certificado y relaciona cada template-field con un
				dato disponible del sistema (nombre de usuario, nombre del evento o % de
				aprobación).
			</Text>

			{error && (
				<Alert color="red" icon={<FaTriangleExclamation size={14} />}>
					{error}
				</Alert>
			)}

			{success && (
				<Alert color="teal" icon={<FaCircleCheck size={14} />}>
					{success}
				</Alert>
			)}

			<Card withBorder radius="md" p="md">
				<Stack gap="sm">
					<TextInput
						label="Template ID"
						placeholder="Ej: 67f..."
						value={templateId}
						onChange={(e) => setTemplateId(e.currentTarget.value)}
					/>

					<Select
						label="Formato de salida"
						value={format}
						onChange={(value) => setFormat((value as CertificateFormat) || "PDF")}
						data={[
							{ value: "PDF", label: "PDF" },
							{ value: "PNG", label: "PNG" },
						]}
					/>

					<Group>
						<Button loading={loadingFields} onClick={handleLoadTemplateFields}>
							Obtener template-fields
						</Button>
						{fields.length > 0 && (
							<Badge color="blue" variant="light">
								{fields.length} field{fields.length !== 1 ? "s" : ""}
							</Badge>
						)}
					</Group>
				</Stack>
			</Card>

			{fields.length > 0 && (
				<Card withBorder radius="md" p="md">
					<Stack gap="sm">
						<Text fw={600}>Relación de campos</Text>
						<Table>
							<Table.Thead>
								<Table.Tr>
									<Table.Th>Template-field</Table.Th>
									<Table.Th>Relación con tu sistema</Table.Th>
								</Table.Tr>
							</Table.Thead>
							<Table.Tbody>
								{fields.map((field) => (
									<Table.Tr key={field._id}>
										<Table.Td>
											<Stack gap={0}>
												<Text size="sm" fw={500}>
													{field.label}
												</Text>
												<Text size="xs" c="dimmed">
													{field.name}
												</Text>
											</Stack>
										</Table.Td>
										<Table.Td>
											<Select
												placeholder="Selecciona un valor"
												data={MAPPING_OPTIONS}
												value={mappings[field.name]}
												onChange={(value) => {
													if (!value) return;
													setMappings((prev) => ({
														...prev,
														[field.name]: value as MappingSource,
													}));
												}}
											/>
										</Table.Td>
									</Table.Tr>
								))}
							</Table.Tbody>
						</Table>

						<Group justify="space-between">
							<Text size="xs" c={missingMappings.length ? "red" : "dimmed"}>
								{missingMappings.length
									? `Faltan ${missingMappings.length} campo(s) por relacionar.`
									: "Todos los campos están relacionados."}
							</Text>
							<Button loading={saving} onClick={handleSaveConfig}>
								Guardar configuración
							</Button>
						</Group>
					</Stack>
				</Card>
			)}
		</Stack>
	);
}
