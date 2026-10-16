#!/usr/bin/env python3
"""Insere no backup os cartões do print de histórico de 12/10/2026."""

import datetime as dt
import sqlite3
import sys


# data|hora do cartão|nome|duração|status|cores visíveis
RAW = r"""
2026-08-23|13:15|MANDRAKE_plate_2|04:50|Sucesso|CINZA/GRAFITE
2026-08-23|11:35|Telescopic Sliding Hello Kitty Head Fidget Toy|03:07|Sucesso|BRANCO
2026-08-23|15:30|Bluey Font Customizable Pencil Topper - ENZO|00:02|Falha|LILÁS,BRANCO
2026-08-23|15:32|Bluey Font Customizable Pencil Topper - ENZO|00:50|Sucesso|LILÁS,BRANCO
2026-08-23|20:46|pedido_completo_plate_3|02:07|Sucesso|CINZA/GRAFITE
2026-08-24|09:09|Icosahedron Gears Fidget Toy|00:27|Falha|PRETO
2026-08-24|19:48|German Flag with Flagpole|00:53|Falha|AZUL PRIME
2026-08-24|20:46|German Flag with Flagpole|01:30|Sucesso|AZUL PRIME
2026-08-24|22:40|PEDIDO_COMPLETO_OFC_plate_3|00:19|Sucesso|BRANCO
2026-08-24|23:36|pedido_completo_plate_4|04:00|Sucesso|CINZA/GRAFITE
2026-08-25|10:09|Flexi Dancing Hello Kitty Fidget Toy|02:00|Sucesso|PRETO
2026-08-25|13:24|Bluey Font Customizable Pencil Topper - MAITE|00:27|Sucesso|VERMELHO,BRANCO
2026-08-25|16:07|Bluey Font Customizable Pencil Topper - HELENA|01:12|Sucesso|VERMELHO,BRANCO
2026-08-25|19:38|Bluey Font Customizable Pencil Topper - AMORTEC|00:13|Falha|VERMELHO,BRANCO
2026-08-25|20:04|Bluey Font Customizable Pencil Topper - AMORTEC|02:10|Falha|VERMELHO,BRANCO
2026-08-25|23:00|Bluey Font Customizable Pencil Topper - AMORTEC|01:36|Sucesso|VERMELHO,BRANCO
2026-08-26|07:31|Bluey Font Customizable Pencil Topper - ALICE|01:42|Sucesso|VERMELHO,BRANCO
2026-08-26|11:55|Bluey Font Customizable Pencil Topper - SADO|00:27|Sucesso|VERMELHO,BRANCO
2026-08-26|13:28|My 10 star fidget design|03:06|Sucesso|LILÁS
2026-08-26|20:44|Bluey Font Customizable Pencil Topper - SADO|00:28|Sucesso|VERMELHO,BRANCO
2026-08-26|21:39|Bluey Font Customizable Pencil Topper - ISABELA|00:51|Falha|VERMELHO,BRANCO
2026-08-26|22:31|Bluey Font Customizable Pencil Topper - ISABELA|02:06|Sucesso|VERMELHO,BRANCO
2026-08-27|07:38|Bluey Font Customizable Pencil Topper - AMORTEC|01:42|Sucesso|VERMELHO,BRANCO
2026-08-27|12:41|Bluey Font Customizable Pencil Topper - ANTONELLA|00:53|Sucesso|VERMELHO,BRANCO
2026-08-27|14:01|Bluey Font Customizable Pencil Topper - OLIVER|00:33|Sucesso|VERMELHO,BRANCO
2026-08-27|23:22|Keyboard clicker fidget|00:43|Falha|BRANCO
2026-08-28|10:11|Keyboard clicker fidget|00:18|Falha|BRANCO
2026-08-28|10:38|Large articulated dragon|02:42|Falha|LILÁS
2026-08-28|14:15|pedido_completo_plate_4|02:42|Falha|CINZA/GRAFITE
2026-08-28|17:08|Bluey Font Customizable Pencil Topper - ALICE|00:30|Sucesso|VERMELHO,BRANCO
2026-08-28|18:05|Bluey Font Customizable Pencil Topper - ALICE|00:01|Falha|VERMELHO,BRANCO
2026-08-28|18:08|Bluey Font Customizable Pencil Topper - ALICE|00:25|Sucesso|VERMELHO,BRANCO
2026-08-28|18:34|Bluey Font Customizable Pencil Topper - HELENA|00:33|Sucesso|VERMELHO,BRANCO
2026-08-28|19:18|Bluey Font Customizable Pencil Topper - SOPHIA|00:31|Sucesso|VERMELHO,BRANCO
2026-08-28|20:08|My 10 star fidget design|03:06|Sucesso|LILÁS
2026-08-29|16:19|James P. Sullivan / NO AMS|03:30|Falha|AZUL BEBÊ
2026-08-30|12:04|Blobtopus - Articulated Twisty Slime Octopus|01:54|Falha|AZUL PRIME
2026-08-30|15:03|pedido_completo_plate_6|00:56|Falha|CINZA/GRAFITE
2026-08-31|11:07|Magic spiral fidget toy|00:01|Falha|LILÁS
2026-08-31|11:16|Magic spiral fidget toy|00:01|Falha|LILÁS
2026-08-31|11:41|Magic spiral fidget toy|00:01|Falha|LILÁS
2026-08-31|11:48|HelixCore - Press-to-Spin Squishy Ball|00:01|Falha|LILÁS
2026-08-31|12:25|Planetary Gear Star Spinner - Sensory Fidget|00:01|Falha|LARANJA
2026-08-31|13:36|Planetary Gear Star Spinner - Sensory Fidget|02:48|Sucesso|LARANJA
2026-08-31|16:30|PETG/Nylon Movie-Accurate Rocky Project Hand|00:58|Sucesso|LARANJA
2026-08-31|18:09|Bluey Font Customizable Pencil Topper - SOPHIA|00:31|Sucesso|VERMELHO,BRANCO
2026-08-31|19:03|Magic spiral fidget toy|03:30|Sucesso|LILÁS
2026-08-31|23:36|Bates mansion - 1960 Psycho - secret cabinet|00:45|Falha|VERDE
2026-09-01|00:24|Bates mansion - 1960 Psycho - secret cabinet|19:06|Sucesso|VERDE
2026-09-01|23:02|The Shooting Star - Sensory Expanded Fidget Toy|05:36|Sucesso|LILÁS
2026-09-02|14:02|HYPER HOPPER HyperHop 2Color|01:42|Sucesso|AZUL PRIME
2026-09-02|17:10|grinder_plate_1|02:12|Sucesso|LILÁS,ROSA BEBE
2026-09-02|19:48|PAM_PEDIDO_plate_1|00:18|Falha|BRANCO,VERMELHO
2026-09-02|20:11|PAM_PEDIDO_plate_1|00:11|Falha|LILÁS,ROSA BEBE
2026-09-02|20:33|PAM_PEDIDO_plate_1|03:30|Sucesso|LILÁS,ROSA BEBE
2026-09-03|00:20|PADRÃO_plate_1|02:24|Sucesso|AZUL PRIME,VERDE
2026-09-03|09:37|HYPER HOPPER HyperHop 2C TIGHT Joints|01:42|Sucesso|LARANJA
2026-09-03|13:04|pedido_completo_plate_6|00:48|Sucesso|CINZA/GRAFITE
2026-09-03|14:10|Guitar Neck Support|01:48|Sucesso|BRANCO,VERMELHO
2026-09-03|16:45|Adjustable GPU Support Nvidia / Radeon|01:24|Sucesso|PRETO,VERMELHO
2026-09-03|18:22|Adjustable GPU Support Nvidia / Radeon|00:45|Sucesso|PRETO
2026-09-03|19:13|Adjustable GPU Support Nvidia / Radeon|01:00|Sucesso|PRETO
2026-09-03|20:28|pedido_completo_plate_4|02:42|Sucesso|CINZA/GRAFITE
2026-09-03|23:24|pedido_completo_plate_5|01:12|Sucesso|CINZA/GRAFITE
2026-09-04|09:50|That Creepy Keychain Hand|03:54|Sucesso|AMARELO
2026-09-04|19:01|Llavero Lilypad Toy Story 5|16:48|Falha|VERDE,AZUL PRIME
2026-09-05|11:58|Bambu AMS Lite Filament Hub Connector|00:03|Falha|PRETO
2026-09-05|16:22|Bambu AMS Lite Filament Hub Connector|02:12|Falha|PRETO
2026-09-05|17:06|Bambu AMS Lite Filament Hub Connector|01:00|Sucesso|PRETO
2026-09-05|21:09|Blobtopus - Articulated Twisty Slime Octopus|00:41|Falha|VERDE
2026-09-05|23:00|My 10 star fidget design|03:00|Sucesso|VERDE
2026-09-07|12:36|Vaso Haiku Japandi|12:48|Sucesso|AREIA
2026-09-08|09:14|Demogorgon mini flexi keychain|03:06|Falha|AREIA,VERMELHO
2026-09-08|13:51|Bambu AMS Lite Filament Hub Connector|00:06|Falha|PRETO
2026-09-15|15:31|Sanrio Kuromi, Keroppi, Cinnamoroll, Melody Collection|00:06|Falha|ROXO,LILÁS
2026-09-15|16:40|3dbenchy|00:22|Falha|LILÁS
2026-09-16|21:44|Cute Cat Paw Cup Mug Can Holder|00:04|Falha|ROSA BEBE
2026-09-16|21:50|Cute Cat Paw Cup Mug Can Holder|00:12|Falha|ROSA BEBE
2026-09-16|22:04|Cute Cat Paw Cup Mug Can Holder|00:26|Falha|ROSA BEBE
2026-09-16|22:30|Cute Cat Paw Cup Mug Can Holder|00:09|Falha|ROSA BEBE
2026-09-16|22:58|pedido_completo_plate_5|00:04|Falha|CINZA/GRAFITE
2026-09-16|23:02|pedido_completo_plate_5|05:36|Sucesso|CINZA/GRAFITE
2026-09-17|14:10|pedido_completo_JOZELANP2|01:42|Sucesso|CINZA/GRAFITE
2026-09-17|16:06|3dbenchy|00:03|Falha|ROSA BEBE
2026-09-17|16:29|Efficient A1 Waste Bin (LIGHT and FAST)|02:12|Sucesso|ROXO
2026-09-17|20:37|pedido_completo_ERICUSP1|02:42|Sucesso|CINZA/GRAFITE
2026-09-17|09:15|pedido_completo_jozelanP1|04:18|Sucesso|CINZA/GRAFITE
2026-09-18|08:38|pedido_completo_ERICUSP2|02:54|Sucesso|CINZA/GRAFITE
2026-09-18|11:54|Jax - The Amazing Digital Circus (TADC) - NO AMS|01:18|Sucesso|ROSA BEBE
2026-09-18|12:25|Jax - The Amazing Digital Circus (TADC) - NO AMS|01:12|Falha|ROSA BEBE,PRETO
2026-09-18|16:17|Jax - The Amazing Digital Circus (TADC) - NO AMS|01:18|Sucesso|ROSA BEBE
2026-09-18|17:54|Jax - The Amazing Digital Circus (TADC) - NO AMS|02:30|Sucesso|LARANJA
2026-09-18|20:34|Jax - The Amazing Digital Circus (TADC) - NO AMS|00:33|Sucesso|AMARELO
2026-09-19|14:01|Jax - The Amazing Digital Circus (TADC) - NO AMS|00:33|Sucesso|LILÁS,PRETO
2026-09-19|15:23|A1/A1 Mini Series 5-way protection bracket|01:00|Falha|BRANCO
2026-09-19|16:41|A1/A1 Mini Series 5-way protection bracket|02:30|Sucesso|BRANCO
2026-09-20|11:14|Demogorgon mini flexi keychain|05:24|Sucesso|AREIA,VERMELHO
2026-09-20|15:32|Demogorgon mini flexi keychain|03:18|Falha|AREIA,VERMELHO
2026-09-21|14:53|Assembly|00:58|Falha|PRETO,VERMELHO
2026-09-21|19:50|ParametricModelMaker_A1_ANTI_COLISAO_PLATE|02:24|Sucesso|PRETO,VERMELHO
2026-09-21|19:37|ParametricModelMaker_A1_ANTI_COLISAO_PLATE|00:11|Falha|PRETO,VERMELHO
2026-09-21|23:08|Fluffy Tail Cute Flexi Squirrel - Toy / Keychain|22:06|Sucesso|AREIA,LILÁS
2026-09-23|08:03|Lula (PT) - Rotating Print in Place Keychain|00:07|Falha|BRANCO,VERMELHO,PRETO
2026-09-23|08:14|Lula (PT) - Rotating Print in Place Keychain|01:00|Falha|BRANCO,VERMELHO,PRETO
2026-09-23|10:26|Zelda's Ocarina|02:54|Sucesso|PRETO
2026-09-23|13:34|HYPER HOPPER HyperHop 2Color|01:42|Sucesso|AZUL PRIME
2026-09-23|16:20|HYPER HOPPER HyperHop 2Color|00:14|Falha|AZUL PRIME
2026-09-24|09:37|Minimalist Portable Chess Set|00:06|Falha|VERDE,AREIA
2026-09-24|12:50|Dedenne Pokedex 702 Pokemon Lightbox|00:20|Sucesso|LILÁS,BRANCO
2026-09-24|13:44|Dedenne Pokedex 702 Pokemon Lightbox|01:00|Sucesso|AMARELO,PRETO,VERMELHO
2026-09-24|15:00|Dedenne Pokedex 702 Pokemon Lightbox|00:03|Falha|LILÁS,BRANCO
2026-09-24|16:11|Dedenne Pokedex 702 Pokemon Lightbox|00:44|Sucesso|LILÁS,BRANCO
2026-09-24|22:14|pedido_completo_plate_9|11:12|Sucesso|CINZA/GRAFITE
2026-09-25|13:40|Lula (PT) - Rotating Print in Place Keychain|01:06|Falha|BRANCO,VERMELHO,PRETO
2026-09-25|15:31|Lula (PT) - Rotating Print in Place Keychain|02:30|Sucesso|VERMELHO,PRETO
2026-09-25|18:42|Lula (PT) - Rotating Print in Place Keychain|04:36|Sucesso|VERMELHO,PRETO
2026-09-25|23:23|Lula (PT) - Rotating Print in Place Keychain|06:18|Sucesso|VERMELHO,PRETO
2026-09-26|12:47|Lula (PT) - Rotating Print in Place Keychain|01:06|Falha|VERMELHO,PRETO
2026-09-26|14:01|Lula (PT) - Rotating Print in Place Keychain|06:00|Sucesso|VERMELHO,PRETO
2026-09-26|20:11|tripo_node_1037ba62 protection bracket|01:12|Sucesso|BRANCO
2026-09-26|21:50|tripo_node_1037ba62 protection bracket|00:30|Sucesso|BRANCO
2026-09-26|22:23|Flexi Rex Keychain Mini Dinosaur Keychain|05:36|Sucesso|LARANJA,AMARELO
2026-09-27|12:10|Articulated Lobster|01:42|Falha|VERMELHO
2026-09-28|11:52|Pawtastic Keychain - Articulated & Customizable|00:06|Falha|LARANJA,CINZA/GRAFITE,ROSA BEBE
2026-09-28|12:41|Pawtastic Keychain - Articulated & Customizable|00:04|Falha|LARANJA,CINZA/GRAFITE,ROSA BEBE
2026-09-28|18:10|tray_W70_D70_H50|01:06|Sucesso|CINZA/GRAFITE
2026-09-28|20:02|Rotating Commercial Display Stand - Keychain|00:21|Falha|BRANCO
2026-09-28|20:25|Rotating Commercial Display Stand - Keychain|00:54|Falha|BRANCO
2026-09-28|21:41|Rotating Commercial Display Stand - Keychain|04:12|Sucesso|BRANCO
2026-09-29|08:07|Rotating Commercial Display Stand - Keychain|01:54|Sucesso|BRANCO
2026-09-29|08:28|Rotating Commercial Display Stand - Keychain|01:36|Sucesso|BRANCO
2026-09-29|10:55|Rotating Commercial Display Stand - Keychain|01:48|Sucesso|BRANCO
2026-09-29|14:26|Rotating Commercial Display Stand - Keychain|00:12|Falha|LILÁS,LARANJA
2026-09-29|14:40|Rotating Commercial Display Stand - Keychain|01:24|Sucesso|LARANJA
2026-09-29|16:09|Rotating Commercial Display Stand - Keychain|00:26|Sucesso|LARANJA
2026-09-29|16:40|Rotating Commercial Display Stand - Keychain|01:00|Falha|LILÁS,LARANJA
2026-09-29|18:13|Rotating Commercial Display Stand - Keychain|01:48|Sucesso|LILÁS,LARANJA
2026-09-29|21:27|Rotating Commercial Display Stand - Keychain|03:06|Sucesso|LILÁS,PRETO
2026-09-30|13:57|Dedeiras - cinco tamanhos de teste|00:52|Falha|PRETO
2026-09-30|15:08|Dedeiras - cinco tamanhos de teste|00:52|Sucesso|PRETO
2026-09-30|16:58|V2_Unha_curta_-_Teste_indicador|00:32|Sucesso|PRETO
2026-09-30|17:47|V3_Unha_curta_-_Teste_indicador|00:48|Sucesso|PRETO
2026-09-30|20:39|Cube|00:14|Falha|PRETO
2026-09-30|20:54|tentativa qr code|00:18|Falha|BRANCO,PRETO
2026-09-30|21:13|tentativa qr code|00:13|Falha|BRANCO,PRETO
2026-09-30|21:27|tentativa qr code|01:06|Sucesso|BRANCO,PRETO
2026-09-30|23:08|Thick Pick (Rob Scallon)|02:36|Sucesso|ROXO
2026-10-01|10:17|Lula (PT) - Rotating Print in Place Keychain|01:24|Falha|VERMELHO,PRETO
2026-10-01|12:04|Lula (PT) - Rotating Print in Place Keychain|00:01|Falha|VERMELHO,PRETO
2026-10-01|12:06|Lula (PT) - Rotating Print in Place Keychain|00:01|Falha|VERMELHO,PRETO
2026-10-01|14:58|Lula (PT) - Rotating Print in Place Keychain|00:19|Falha|VERMELHO,PRETO
2026-10-01|15:01|Lula (PT) - Rotating Print in Place Keychain|00:44|Sucesso|VERMELHO,PRETO
2026-10-01|20:07|Patrick Star|12:00|Sucesso|ROSA BEBE,VERDE
2026-10-02|09:41|Aliens Toy Story|18:54|Sucesso|VERDE,AZUL PRIME
2026-10-03|16:02|GTA VI Keychain Collection Pack 1|00:01|Falha|PRETO
2026-10-03|16:08|GTA VI Keychain Collection Pack 1|00:01|Falha|PRETO
2026-10-03|16:59|GTA VI Keychain Collection Pack 1|01:54|Sucesso|PRETO
2026-10-03|19:05|GTA VI Keychain Collection Pack 1|00:16|Falha|PRETO
2026-10-03|19:33|GTA VI Keychain Collection Pack 1|00:33|Falha|PRETO
2026-10-04|08:57|PETG/Nylon Movie-Accurate Rocky Project Hand|09:06|Sucesso|LARANJA
2026-10-04|18:26|PETG/Nylon Movie-Accurate Rocky Project Hand|07:54|Sucesso|LARANJA
2026-10-05|13:55|Laptop Stand V1 - Simple & Ergonomic|02:24|Sucesso|PRETO
2026-10-05|17:45|Build Plate Cleaner for A1 Mini - Speed Optimized|00:25|Falha|AZUL BEBÊ
2026-10-05|19:49|Bambu Lab Build Plate Cleaner A1 P1S A1 Mini|00:36|Sucesso|BRANCO
2026-10-05|20:42|Color Mixing Palette|01:48|Sucesso|BRANCO
2026-10-05|22:34|Fairly OddParents - Wand and Crown|04:18|Sucesso|PRETO,AMARELO
2026-10-06|07:30|Fairly OddParents - Wand and Crown|02:24|Sucesso|PRETO,AMARELO
2026-10-06|13:11|Fairly OddParents - Wand and Crown|01:00|Sucesso|PRETO
2026-10-06|14:34|pedido_YLAN_PLATE4_Gabinete_MesaBoogie_91|02:42|Sucesso|PRETO
2026-10-06|17:34|pedido_YLAN_PLATE4_Gabinete_MesaBoogie_91|02:36|Sucesso|PRETO
2026-10-06|20:42|base_MINIATURAS_plate_2|01:54|Sucesso|PRETO,ROXO
2026-10-06|22:52|Parametric Jar (Change size to your needs)|09:30|Sucesso|CINZA/GRAFITE
2026-10-07|14:12|01_inferior_esquerda_plate_1|16:30|Sucesso|CINZA CLARO (OUTLET)
2026-10-08|14:51|base_COMPLETA_PLATES_2_3_4_BASE_PLANA|13:48|Sucesso|CINZA CLARO (OUTLET)
2026-10-09|07:48|model|05:06|Falha|CINZA CLARO (OUTLET)
2026-10-09|13:20|modelREVISADO|00:35|Falha|CINZA CLARO (OUTLET)
2026-10-09|14:43|modelREVISADO|08:42|Sucesso|CINZA CLARO (OUTLET)
2026-10-10|09:57|pedidoisabelaZEZO_20x20cm_CHROMA|09:00|Sucesso|PRETO
2026-10-10|19:02|pedido_YLAN_PLATE2_MESA_SEM_FUROS_3MF|02:42|Sucesso|PRETO
2026-10-11|00:12|Crab spoon rest|01:42|Sucesso|VERMELHO FOGO
2026-10-11|14:23|PETG/Nylon Movie-Accurate Rocky Project Hand|02:06|Sucesso|LARANJA
2026-10-11|16:46|Macca the Gator Figure GTA VI Collector's Edition|02:06|Falha|ROSA BEBE
2026-10-11|18:56|First Layer Calibration & Bed Cleaning|00:32|Sucesso|CINZA CLARO (OUTLET)
2026-10-11|20:09|Macca the Gator Figure GTA VI Collector's Edition|06:24|Sucesso|ROSA BEBE
2026-10-12|12:00|Mini High SCARY Ghost Face - Sitting on Monitor|00:46|Falha|PRETO
2026-10-12|14:38|Mini High SCARY Ghost Face - Sitting on Monitor|00:46|Falha|PRETO
2026-10-12|15:29|Mini High SCARY Ghost Face - Sitting on Monitor|04:06|Sucesso|PRETO
""".strip()


COLOR_IDS = {
    "CINZA/GRAFITE": "19", "CINZA CLARO (OUTLET)": "1791509288674",
    "BRANCO": "1787613815549", "PRETO": "20", "ROXO": "2",
    "LARANJA": "1789437304753", "AMARELO": "6", "VERDE": "7",
    "VERMELHO": "8", "VERMELHO FOGO": "1791227319781", "AZUL PRIME": "9",
    "AZUL BEBÊ": "1787505912006", "ROSA BEBE": "18", "AREIA": "1787417361759",
    "LILÁS": "1787505773096",
}


def rows():
    for line in RAW.splitlines():
        date, clock, name, duration, status, colors = line.split("|", 5)
        yield date, clock, name, duration, status, colors.split(",")


def estimate_grams(duration, status):
    hours, minutes = map(int, duration.split(":"))
    total_hours = hours + minutes / 60
    rate = 9.0 if status == "Sucesso" else 4.0
    return round(max(0.5, total_hours * rate), 1)


def main(db_path):
    con = sqlite3.connect(db_path)
    existing = set(con.execute(
        "SELECT data_impressao, nome_peca, tempo_impressao, status FROM hist_impressoes"
    ))
    inserted = 0
    for idx, (date, clock, name, duration, status, colors) in enumerate(rows()):
        signature = (date, name, duration, status)
        if signature in existing:
            continue
        local = dt.datetime.fromisoformat(f"{date}T{clock}:00").replace(
            tzinfo=dt.timezone(dt.timedelta(hours=-3))
        )
        hist_id = str(int(local.timestamp() * 1000) + idx)
        created = local.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")
        con.execute(
            """INSERT INTO hist_impressoes
               (id,data_impressao,nome_peca,tempo_impressao,status,observacao,data_registro,criado_em)
               VALUES (?,?,?,?,?,?,?,?)""",
            (hist_id, date, name, duration, status,
             "Importado do print Bambu em 12/10/2026; gramatura estimada.", date, created),
        )
        total = estimate_grams(duration, status)
        per_color = round(total / len(colors), 1)
        for color_idx, color in enumerate(colors):
            fil_id = COLOR_IDS[color]
            row_id = str(int(hist_id) + 500 + color_idx)
            con.execute(
                """INSERT INTO hist_filamentos
                   (id,hist_id,filamento_id,peso_modelo_g,peso_purga_g,cor,criado_em)
                   VALUES (?,?,?,?,?,?,?)""",
                (row_id, hist_id, fil_id, str(per_color), "0", color, created),
            )
        existing.add(signature)
        inserted += 1
    con.commit()
    total = con.execute("SELECT count(*) FROM hist_impressoes").fetchone()[0]
    con.close()
    print(f"Inseridos: {inserted}; total no histórico: {total}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(f"Uso: {sys.argv[0]} caminho/print_manager_v2.db")
    main(sys.argv[1])
