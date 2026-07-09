# GUARDIAN VISUAL BIBLE
Version: 1.0
Estado: Documento oficial de diseno visual de Guardianes
Alcance de esta version: IGNIS (unicamente)

---

## IGNIS - Especificacion Visual Oficial

### 1. Vision general del personaje
IGNIS debe comunicar coraje disciplinado, energia contenida y poder en ascenso. No es un monstruo salvaje ni una mascota caricaturesca. Es un guardian marcial de fuego, noble y firme, con presencia heroica apta para videojuego AAA estilizado.

Identidad de lectura inmediata:
- Elemento: Fuego.
- Rol visual: Ofensivo frontal, protector de corto alcance.
- Valor simbolico: Coraje que se controla, no rabia desbordada.

---

### 2. Silueta
Silueta principal: triangulo ascendente con base estable.

Claves de silueta:
- Cabeza y cresta con direccion hacia arriba (sensacion de ascenso).
- Hombros angulados hacia atras para postura de avance.
- Antebrazos mas anchos que brazos para lectura de impacto.
- Cola de fuego segmentada que equilibra visualmente la figura.
- Piernas compactas y potentes con apoyo amplio.

Regla de aprobacion de silueta:
- Debe reconocerse en negro solido en menos de 2 segundos, incluso sin texturas ni color.

---

### 3. Anatomia
Base anatomica: criatura bipedo-reptil con rasgos de salamandra heroica.

Distribucion anatomica recomendada:
- Cabeza: 1 unidad.
- Cuello: corto y robusto.
- Torso: 1.2 unidades, caja toracica definida.
- Brazos: 0.95 unidades.
- Antebrazos: 1.05 unidades (ligeramente sobredimensionados).
- Piernas: 1.15 unidades.
- Cola: 1.0 unidad visual de extension.

Linea de accion:
- Curva en S leve en reposo.
- Curva mas agresiva en ataque, manteniendo balance marcial.

---

### 4. Tamano
Escala de referencia (forma base):
- Altura visual equivalente: 1.15 m a 1.25 m en escena de personaje.
- Masa visual: media-alta para su talla.
- En comparativa de roster: pequeno-mediano, pero con presencia de tanque ligero ofensivo.

Escala para modelado futuro:
- Unidad recomendada en engine: 115 a 125 cm de alto base.
- Radio de colision visual sugerido: 30 a 36 cm.

---

### 5. Expresion facial
Expresion por defecto:
- Determinacion calmada.
- Cejas inclinadas en foco, no en enojo extremo.
- Boca cerrada o semiabierta con respiracion de calor.

Expresiones permitidas:
- Foco de combate.
- Esfuerzo intenso.
- Victoria con orgullo sobrio.
- Empatia protectora con aliados.

Expresiones prohibidas:
- Sadismo.
- Burla cruel.
- Muecas grotescas.

---

### 6. Ojos
Forma:
- Ojos almendrados con angulo ascendente leve.
- Pupila vertical suave (inspiracion reptil noble, no depredador terrorifico).

Capas de color:
- Iris externo: naranja profundo.
- Iris interno: amarillo fuego.
- Nucleo especular: blanco calido.

Comportamiento visual:
- Brillo interno pulsante muy sutil en idle.
- Intensificacion de luminosidad durante ataque y habilidad.

---

### 7. Materiales
Materiales principales:
- Piel-escama semimate estilizada.
- Placas termicas en antebrazos y hombros (semi-metal ceremonial).
- Nucleo pectoral con material cristal-igneo emisivo.

PBR target (referencia de intencion):
- Roughness medio en piel.
- Roughness bajo en bordes de placas.
- Emissive controlado en nucleo, ojos y cola.

Evitar:
- Acabado plastico brillante.
- Metal hiperrealista militar.

---

### 8. Colores
Direccion de color:
- Dominante calido con contraste oscuro para legibilidad.
- El fuego debe leerse en capas, no como mancha uniforme.

Paleta principal narrativa:
- Rojo carbon para cuerpo base.
- Naranja intenso para volumen activo.
- Dorado calido para energia noble.
- Negro ceniza para sombra estructural.

---

### 9. Texturas
Nivel de detalle:
- Medio controlado.
- Microdetalle solo en rostro, placas y nucleo.

Patrones:
- Escama simplificada en torso y muslos.
- Grietas termicas muy sutiles en antebrazos.
- Transicion suave entre piel y zonas emisivas.

Evitar:
- Ruido procedural excesivo.
- Textura repetitiva evidente en UV.

---

### 10. Accesorios
Accesorios oficiales de IGNIS (forma base):
- Sello de Union en placa pectoral secundaria.
- Banda ceremonial corta en brazo no dominante.
- Anillo termico dorsal (mini halo posterior, no flotante exagerado).

Funcion narrativa de accesorios:
- Comunicar que pertenece al sistema Union Guardians y no a una criatura salvaje generica.

---

### 11. Armadura
Concepto de armadura:
- Armadura ceremonial funcional.
- No militar pesada.

Partes base:
- Hombreras compactas con borde de brasa.
- Guardas de antebrazo en capas.
- Faja toracica con nodo de energia.
- Rodilleras ligeras de proteccion termica.

Regla de evolucion:
- Aumenta complejidad por etapa, sin ocultar anatomia ni silueta principal.

---

### 12. Efectos de fuego
Capas VFX de IGNIS:
- Capa 1 (nucleo): brillo calido pulsante cerca de pecho y ojos.
- Capa 2 (llama primaria): borde de llama estilizada en cola y antebrazos.
- Capa 3 (residuo): chispas pequenas y humo tenue en movimientos rapidos.

Comportamiento:
- Idle: 20% intensidad.
- Caminar: 35% intensidad con estela corta.
- Ataque: 90% intensidad con impacto concentrado.
- Victoria: 55% intensidad ceremonial.
- Derrota: 10% intensidad, llama inestable pero viva.

---

### 13. Aura
Aura oficial:
- Forma: corona de calor eliptica alrededor del torso superior.
- Color: dorado-anaranjado con borde rojo.
- Ritmo: respiracion visual sincronizada con pecho.

Lectura emocional del aura:
- Tranquila en reposo.
- Determinada en combate.
- Radiante en victoria.

Evitar:
- Aura que tape silueta.
- Particulas caoticas permanentes.

---

### 14. Animacion Idle
Objetivo: transmitir energia contenida y preparacion.

Loop sugerido (4.5 a 6 segundos):
1. Microinhalacion con elevacion minima de hombros.
2. Pulso leve de nucleo pectoral.
3. Ajuste de apoyo en pies (1-2 cm visuales).
4. Movimiento suave de cola en arco corto.
5. Parpadeo cada 3-5 segundos con variacion natural.

Notas:
- Evitar rebotes caricaturescos.
- Mantener centro de gravedad estable.

---

### 15. Animacion al caminar
Objetivo: desplazamiento firme y confiado.

Caracteristicas:
- Paso corto-medio, cadencia decidida.
- Rotacion de torso minima (disciplina marcial).
- Cola acompana balance con retardo fisico suave.
- Chispas ocasionales en contacto fuerte de talon/punta.

Parametros de estilo:
- No correr en walk cycle.
- Evitar desplazamiento felino sigiloso para no romper identidad frontal.

---

### 16. Animacion de ataque
Objetivo: impacto potente con lectura clara.

Estructura recomendada:
- Anticipacion: 8 a 12 frames.
- Golpe: 3 a 5 frames de maxima extension.
- Recuperacion: 10 a 14 frames.

Firma visual:
- Antebrazo dominante envuelto en llama dirigida.
- Frame de impacto con flare corto y anillo de calor.
- Breve follow-through de cola para balance.

Reglas:
- El ataque debe sentirse pesado y tecnico, no salvaje descontrolado.

---

### 17. Animacion de victoria
Objetivo: orgullo noble, no arrogancia.

Secuencia:
1. Endereza postura.
2. Eleva pecho y mirada.
3. Llama de cola asciende en espiral corta.
4. Golpe de punio al pecho o gesto de juramento.

Duracion sugerida:
- 2.2 a 3.0 segundos.

---

### 18. Animacion de derrota
Objetivo: mostrar desgaste sin humillacion.

Secuencia:
1. Rodilla al suelo o inclinacion fuerte.
2. Llama desciende de intensidad.
3. Respiracion pesada visible.
4. Mantiene mirada de determinacion.

Regla de tono:
- IGNIS pierde el combate, pero no pierde dignidad.

---

### 19. Evoluciones (5 etapas)
Nomenclatura oficial:
1. Chispa.
2. Brasa.
3. Llama.
4. Fulgor.
5. Sol de Fuego.

---

### 20. Cambios fisicos por evolucion

#### Etapa 1 - Chispa
- Cuerpo compacto y juvenil.
- Armadura minima.
- Cola corta con llama inestable.
- Ojos grandes de alta expresividad.

#### Etapa 2 - Brasa
- Aumento de masa en torso y antebrazos.
- Placas termicas iniciales en hombros.
- Cola mas larga y estable.
- Aura mas definida alrededor del pecho.

#### Etapa 3 - Llama
- Proporciones mas heroicas.
- Armadura ceremonial intermedia.
- Nucleo pectoral visible y pulsante.
- Cornisa de fuego en espalda superior.

#### Etapa 4 - Fulgor
- Silueta dominante y ofensiva.
- Placas avanzadas con bordes luminosos.
- Cola segmentada con doble capa de fuego.
- Ojos con halo interno dorado.

#### Etapa 5 - Sol de Fuego
- Forma maestra, presencia de guardian mayor.
- Armadura ceremonial completa, ligera y elegante.
- Corona termica sobre hombros/espalda.
- Nucleo pectoral con geometria solar.
- Aura estable de alta intensidad con control total.

---

### 21. Paleta oficial de colores (HEX)

Base cuerpo:
- Rojo Carbon Primario: #C62828
- Rojo Oscuro Estructural: #8E1B1B

Volumen y acentos:
- Naranja Intenso: #F57C00
- Naranja Calido Secundario: #FF9800

Energia y brillo:
- Dorado Fuego: #FFC107
- Amarillo Brasa: #FFD54F
- Blanco Calido Emisivo: #FFF3E0

Sombras:
- Negro Ceniza: #212121
- Marron Carbon: #4E342E

Detalle ceremonial:
- Bronce Ceremonial: #B87333

Reglas de uso:
- Minimo 60% colores base cuerpo.
- Maximo 20% emisivo simultaneo en pantalla.
- Sombras no deben volverse grises neutras; conservar temperatura calida.

---

### 22. Emociones que transmite
IGNIS debe transmitir:
- Coraje.
- Determinacion.
- Proteccion.
- Disciplina en el poder.
- Esperanza activa tras la caida.

No debe transmitir:
- Crueldad.
- Caos desmedido.
- Violencia gratuita.

---

### 23. Como debe verse en estilo 3D
Objetivo de render:
- AAA estilizado heroico.
- Lectura limpia en camara cercana y media.
- Excelente respuesta a iluminacion dinamica.

Guias tecnicas de intencion visual:
- Topologia orientada a deformacion limpia en hombros, codos, cadera y cola.
- Normal maps suaves para detalle secundario.
- Emissive maps con mascara por estados de animacion.
- Material instance para control de intensidad de fuego por estado.

Presentacion recomendada de turnaround:
- Front, 3/4 front, side, 3/4 back, back.
- Pose neutral + pose de combate.
- Version con VFX on/off para revision de forma.

---

### 24. Errores visuales que deben evitarse
- Copiar siluetas o patrones de criaturas de franquicias conocidas.
- Cabeza excesivamente grande estilo juguete.
- Llama constante gigantesca que oculta anatomia.
- Demasiado detalle de escama tipo realismo fotografico.
- Armadura militar pesada que rompa tono ceremonial.
- Ojos agresivos tipo villano permanente.
- Saturacion extrema en todo el cuerpo sin zonas de descanso visual.
- Animaciones con rebote caricaturesco exagerado.
- Derrota humillante o comica que contradiga rol heroico.

---

### 25. Criterio de aprobacion final para IGNIS
Un diseno de IGNIS queda aprobado solo si cumple todo lo siguiente:
- Silueta reconocible en negro solido.
- Paleta oficial aplicada con jerarquia correcta.
- Materiales y texturas en tono estilizado AAA.
- Armadura ceremonial coherente con universo Union Guardians.
- VFX de fuego legible y controlado.
- Set de animaciones base con personalidad consistente.
- Evoluciones con progresion fisica clara y canonica.
- Emocion principal de coraje disciplinado perceptible sin texto.

---

Fin de version 1.0 - IGNIS.
Siguiente fase sugerida: AQUA, manteniendo la misma estructura de detalle para homogeneidad de Biblia Visual.