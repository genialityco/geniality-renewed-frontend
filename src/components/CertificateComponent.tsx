import { useEffect, useRef, useState } from "react";
import {
	Alert,
	Badge,
	Button,
	Card,
	ColorInput,
	FileInput,
	Group,
	Select,
	SegmentedControl,
	Slider,
	Stack,
	Switch,
	Text,
	TextInput,
} from "@mantine/core";
import { FaCircleCheck, FaTriangleExclamation, FaTrash, FaPlus, FaUpload } from "react-icons/fa6";
import {
	CertificateFieldDataSource,
	CertificateFieldType,
	CertificateFormat,
	CertificateTemplate,
	deleteCertificateTemplate,
	getCertificateTemplateByEvent,
	TemplateFieldElement,
	uploadCertificateBackground,
	upsertCertificateTemplate,
} from "../services/certificateService";

interface Props {
	eventId: string;
}

interface EditableField {
	id: string;
	name: string;
	label: string;
	type: CertificateFieldType;
	required: boolean;
	defaultValue: string;
	dataSource: CertificateFieldDataSource;
	xPercent: number;
	yPercent: number;
	fontSize: number;
	fontColor: string;
	fontWeight: "normal" | "bold";
	textAlign: "left" | "center" | "right";
	rotation: number;
}

const DATA_SOURCE_OPTIONS = [
	{ value: "userName", label: "Nombre de usuario" },
	{ value: "eventName", label: "Nombre del evento" },
	{ value: "approvalPercentage", label: "% de aprobación" },
	{ value: "custom", label: "Texto fijo" },
];

const FIELD_TYPE_OPTIONS = [
	{ value: "TEXT", label: "Texto" },
	{ value: "EMAIL", label: "Email" },
	{ value: "DATE", label: "Fecha" },
	{ value: "NUMBER", label: "Número" },
];

function slugify(label: string): string {
	return label
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/(^_|_$)/g, "");
}

function makeUniqueName(base: string, existing: string[]): string {
	const cleaned = base || "campo";
	let candidate = cleaned;
	let i = 1;
	while (existing.includes(candidate)) {
		candidate = `${cleaned}_${i}`;
		i += 1;
	}
	return candidate;
}

function estimateBoxSize(label: string, fontSize: number) {
	const width = Math.max(80, Math.round((label || "Campo").length * fontSize * 0.62 + 24));
	const height = Math.round(fontSize * 1.7);
	return { width, height };
}

export default function CertificateComponent({ eventId }: Props) {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [format, setFormat] = useState<CertificateFormat>("PNG");
	const [backgroundUrl, setBackgroundUrl] = useState("");
	const [imageWidth, setImageWidth] = useState(0);
	const [imageHeight, setImageHeight] = useState(0);
	const [fields, setFields] = useState<EditableField[]>([]);
	const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

	const canvasRef = useRef<HTMLDivElement>(null);
	const dragState = useRef<{ id: string; startX: number; startY: number; startXPercent: number; startYPercent: number } | null>(null);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				setLoading(true);
				const template = await getCertificateTemplateByEvent(eventId);
				if (!mounted) return;
				if (template) {
					loadTemplate(template);
				}
			} catch {
				if (mounted) setError("No se pudo cargar la configuración actual del certificado.");
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [eventId]);

	const loadTemplate = (template: CertificateTemplate) => {
		setExistingTemplateId(template._id);
		setName(template.name || "");
		setFormat(template.format || "PNG");
		setBackgroundUrl(template.backgroundUrl);
		setImageWidth(template.width);
		setImageHeight(template.height);
		setFields(
			template.fields.map((f, index) => ({
				id: `${f.name}-${index}`,
				name: f.name,
				label: f.label,
				type: f.type,
				required: f.required,
				defaultValue: f.defaultValue || "",
				dataSource: f.dataSource,
				xPercent: (f.posX / template.width) * 100,
				yPercent: (f.posY / template.height) * 100,
				fontSize: f.fontSize,
				fontColor: f.fontColor,
				fontWeight: f.fontWeight,
				textAlign: f.textAlign,
				rotation: f.rotation,
			})),
		);
	};

	const handleImageChange = async (file: File | null) => {
		if (!file) return;

		if (!["image/png", "image/jpeg"].includes(file.type)) {
			setError("Solo se permiten imágenes PNG o JPG.");
			return;
		}
		if (file.size > 10 * 1024 * 1024) {
			setError("La imagen no puede superar los 10MB.");
			return;
		}

		try {
			setUploading(true);
			setError(null);

			const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = (e) => {
					const img = new Image();
					img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
					img.onerror = () => reject(new Error("No se pudieron detectar las dimensiones de la imagen."));
					img.src = e.target?.result as string;
				};
				reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
				reader.readAsDataURL(file);
			});

			const { url } = await uploadCertificateBackground(file);
			setBackgroundUrl(url);
			setImageWidth(dimensions.width);
			setImageHeight(dimensions.height);
		} catch (e: any) {
			setError(e?.response?.data?.message || e?.message || "No se pudo subir la imagen.");
		} finally {
			setUploading(false);
		}
	};

	const handleAddField = () => {
		const label = "Nuevo campo";
		const name = makeUniqueName(slugify(label), fields.map((f) => f.name));
		const field: EditableField = {
			id: `${Date.now()}`,
			name,
			label,
			type: "TEXT",
			required: false,
			defaultValue: "",
			dataSource: "custom",
			xPercent: 50,
			yPercent: 50,
			fontSize: 24,
			fontColor: "#000000",
			fontWeight: "normal",
			textAlign: "center",
			rotation: 0,
		};
		setFields((prev) => [...prev, field]);
		setSelectedFieldId(field.id);
	};

	const handleUpdateField = (id: string, updates: Partial<EditableField>) => {
		setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
	};

	const handleDeleteField = (id: string) => {
		setFields((prev) => prev.filter((f) => f.id !== id));
		setSelectedFieldId(null);
	};

	const handleFieldMouseDown = (e: React.MouseEvent, field: EditableField) => {
		e.stopPropagation();
		setSelectedFieldId(field.id);
		dragState.current = {
			id: field.id,
			startX: e.clientX,
			startY: e.clientY,
			startXPercent: field.xPercent,
			startYPercent: field.yPercent,
		};
	};

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			const drag = dragState.current;
			if (!drag || !canvasRef.current) return;
			const rect = canvasRef.current.getBoundingClientRect();
			const deltaXPercent = ((e.clientX - drag.startX) / rect.width) * 100;
			const deltaYPercent = ((e.clientY - drag.startY) / rect.height) * 100;
			const xPercent = Math.max(0, Math.min(100, drag.startXPercent + deltaXPercent));
			const yPercent = Math.max(0, Math.min(100, drag.startYPercent + deltaYPercent));
			handleUpdateField(drag.id, { xPercent, yPercent });
		};
		const handleMouseUp = () => {
			dragState.current = null;
		};
		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const selectedField = fields.find((f) => f.id === selectedFieldId) || null;

	const handleSave = async () => {
		if (!backgroundUrl || !imageWidth || !imageHeight) {
			setError("Debes subir una imagen de fondo para el certificado.");
			return;
		}
		if (!fields.length) {
			setError("Agrega al menos un campo al certificado.");
			return;
		}

		try {
			setSaving(true);
			setError(null);
			setSuccess(null);

			const payloadFields: TemplateFieldElement[] = fields.map((f, index) => {
				const box = estimateBoxSize(f.label, f.fontSize);
				return {
					name: f.name,
					label: f.label,
					type: f.type,
					required: f.required,
					defaultValue: f.defaultValue || null,
					dataSource: f.dataSource,
					posX: Math.round((f.xPercent / 100) * imageWidth),
					posY: Math.round((f.yPercent / 100) * imageHeight),
					width: box.width,
					height: box.height,
					fontSize: f.fontSize,
					fontFamily: "Arial",
					fontColor: f.fontColor,
					fontWeight: f.fontWeight,
					textAlign: f.textAlign,
					rotation: f.rotation,
					order: index,
				};
			});

			const template = await upsertCertificateTemplate(eventId, {
				name: name || undefined,
				backgroundUrl,
				width: imageWidth,
				height: imageHeight,
				format,
				fields: payloadFields,
			});

			setExistingTemplateId(template._id);
			setSuccess("Certificado guardado correctamente.");
		} catch (e: any) {
			setError(e?.response?.data?.message || "No se pudo guardar el certificado.");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		try {
			setSaving(true);
			setError(null);
			await deleteCertificateTemplate(eventId);
			setExistingTemplateId(null);
			setBackgroundUrl("");
			setImageWidth(0);
			setImageHeight(0);
			setFields([]);
			setSuccess("Certificado eliminado correctamente.");
		} catch (e: any) {
			setError(e?.response?.data?.message || "No se pudo eliminar el certificado.");
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
				Sube la imagen de fondo del certificado y ubica los campos directamente sobre ella. El
				certificado se genera y descarga desde aquí, sin depender de un servicio externo.
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
					<Group grow>
						<TextInput
							label="Nombre del certificado (opcional)"
							placeholder="Ej: Certificado de aprobación"
							value={name}
							onChange={(e) => setName(e.currentTarget.value)}
						/>
						<Select
							label="Formato de descarga"
							value={format}
							onChange={(value) => setFormat((value as CertificateFormat) || "PNG")}
							data={[
								{ value: "PNG", label: "PNG" },
								{ value: "PDF", label: "PDF" },
							]}
						/>
					</Group>

					<FileInput
						label="Imagen de fondo"
						placeholder="Selecciona un PNG o JPG (máx. 10MB)"
						accept="image/png,image/jpeg"
						leftSection={<FaUpload size={14} />}
						onChange={handleImageChange}
						disabled={uploading}
					/>
					{uploading && <Text size="xs" c="dimmed">Subiendo imagen...</Text>}
				</Stack>
			</Card>

			{backgroundUrl && (
				<Card withBorder radius="md" p="md">
					<Group align="flex-start" gap="lg" wrap="nowrap">
						<div style={{ flex: 3, minWidth: 0 }}>
							<div
								ref={canvasRef}
								onMouseDown={() => setSelectedFieldId(null)}
								style={{
									position: "relative",
									width: "100%",
									aspectRatio: `${imageWidth} / ${imageHeight}`,
									backgroundImage: `url(${backgroundUrl})`,
									backgroundSize: "100% 100%",
									backgroundRepeat: "no-repeat",
									border: "1px solid #dee2e6",
									borderRadius: 8,
									overflow: "hidden",
									userSelect: "none",
								}}
							>
								{fields.map((field) => (
									<div
										key={field.id}
										onMouseDown={(e) => handleFieldMouseDown(e, field)}
										style={{
											position: "absolute",
											left: `${field.xPercent}%`,
											top: `${field.yPercent}%`,
											transform: `translate(-50%, -50%) rotate(${field.rotation}deg)`,
											cursor: "grab",
											padding: "2px 6px",
											whiteSpace: "nowrap",
											fontSize: `${Math.max(10, field.fontSize * 0.5)}px`,
											fontWeight: field.fontWeight,
											textAlign: field.textAlign,
											color: field.fontColor,
											background:
												selectedFieldId === field.id ? "rgba(34,139,230,0.15)" : "rgba(255,255,255,0.35)",
											border:
												selectedFieldId === field.id
													? "1.5px solid #228be6"
													: "1px dashed rgba(0,0,0,0.35)",
											borderRadius: 4,
										}}
									>
										{field.label}
									</div>
								))}
							</div>

							<Group mt="sm">
								<Button size="xs" leftSection={<FaPlus size={12} />} onClick={handleAddField}>
									Agregar campo
								</Button>
								<Badge color="blue" variant="light">
									{fields.length} campo{fields.length !== 1 ? "s" : ""}
								</Badge>
							</Group>
						</div>

						<div style={{ flex: 2, minWidth: 260 }}>
							{selectedField ? (
								<Stack gap="xs">
									<Text fw={600} size="sm">
										Propiedades del campo
									</Text>
									<TextInput
										label="Etiqueta"
										value={selectedField.label}
										onChange={(e) => handleUpdateField(selectedField.id, { label: e.currentTarget.value })}
									/>
									<Select
										label="Origen del dato"
										data={DATA_SOURCE_OPTIONS}
										value={selectedField.dataSource}
										onChange={(value) =>
											handleUpdateField(selectedField.id, {
												dataSource: (value as CertificateFieldDataSource) || "custom",
											})
										}
									/>
									{selectedField.dataSource === "custom" && (
										<TextInput
											label="Texto fijo"
											placeholder="Texto que se mostrará siempre"
											value={selectedField.defaultValue}
											onChange={(e) =>
												handleUpdateField(selectedField.id, { defaultValue: e.currentTarget.value })
											}
										/>
									)}
									<Select
										label="Tipo"
										data={FIELD_TYPE_OPTIONS}
										value={selectedField.type}
										onChange={(value) =>
											handleUpdateField(selectedField.id, { type: (value as CertificateFieldType) || "TEXT" })
										}
									/>
									<div>
										<Text size="xs" fw={500} mb={4}>
											Tamaño de fuente: {selectedField.fontSize}px
										</Text>
										<Slider
											min={8}
											max={72}
											value={selectedField.fontSize}
											onChange={(value) => handleUpdateField(selectedField.id, { fontSize: value })}
										/>
									</div>
									<ColorInput
										label="Color"
										value={selectedField.fontColor}
										onChange={(value) => handleUpdateField(selectedField.id, { fontColor: value })}
									/>
									<div>
										<Text size="xs" fw={500} mb={4}>
											Alineación
										</Text>
										<SegmentedControl
											fullWidth
											value={selectedField.textAlign}
											onChange={(value) =>
												handleUpdateField(selectedField.id, { textAlign: value as EditableField["textAlign"] })
											}
											data={[
												{ label: "Izq.", value: "left" },
												{ label: "Centro", value: "center" },
												{ label: "Der.", value: "right" },
											]}
										/>
									</div>
									<div>
										<Text size="xs" fw={500} mb={4}>
											Rotación: {selectedField.rotation}°
										</Text>
										<Slider
											min={-180}
											max={180}
											value={selectedField.rotation}
											onChange={(value) => handleUpdateField(selectedField.id, { rotation: value })}
										/>
									</div>
									<Switch
										label="Negrita"
										checked={selectedField.fontWeight === "bold"}
										onChange={(e) =>
											handleUpdateField(selectedField.id, {
												fontWeight: e.currentTarget.checked ? "bold" : "normal",
											})
										}
									/>
									<Switch
										label="Requerido"
										checked={selectedField.required}
										onChange={(e) => handleUpdateField(selectedField.id, { required: e.currentTarget.checked })}
									/>
									<Button
										color="red"
										variant="light"
										size="xs"
										leftSection={<FaTrash size={12} />}
										onClick={() => handleDeleteField(selectedField.id)}
									>
										Eliminar campo
									</Button>
								</Stack>
							) : (
								<Text size="sm" c="dimmed">
									Haz clic en un campo sobre la imagen para editar sus propiedades, o agrega uno nuevo.
								</Text>
							)}
						</div>
					</Group>
				</Card>
			)}

			<Group justify="space-between">
				{existingTemplateId ? (
					<Button color="red" variant="subtle" loading={saving} onClick={handleDelete}>
						Eliminar certificado
					</Button>
				) : (
					<div />
				)}
				<Button loading={saving} onClick={handleSave}>
					Guardar certificado
				</Button>
			</Group>
		</Stack>
	);
}
