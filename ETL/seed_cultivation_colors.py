import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

CULTIVATION_DATA = {
    "Garuda Prime": {
        "color": "#A8002A",
        "school": "Crimson Sanguinary School",
        "art": "Crimson Maiden Dao of the Severing Heart",
    },
    "Valkyr Prime": {
        "color": "#C92E1F",
        "school": "Crimson Sanguinary School",
        "art": "Berserker Scripture of the Flayed Valkyrja",
    },
    "Kullervo": {
        "color": "#B8362E",
        "school": "Crimson Sanguinary School",
        "art": "Cursed Blade Heresy of Seven Sins",
    },

    "Ember Prime": {
        "color": "#FF4500",
        "school": "Adolla Pyric School",
        "art": "Inferno Phoenix Dao of Meteoric Wrath",
    },
    "Wisp Prime": {
        "color": "#F4E07A",
        "school": "Adolla Pyric School",
        "art": "Solar Gate Sutra of the Wandering Lantern",
    },
    "Jade": {
        "color": "#FFFAE6",
        "school": "Adolla Pyric School",
        "art": "Seraphic Choir Sutra of the Ophanim Wheels",
    },

    "Oberon Prime": {
        "color": "#2E7D4F",
        "school": "Hallowed Path of Heaven's Light",
        "art": "Verdant Stag Sutra of the Hallowed Grove",
    },
    "Trinity Prime": {
        "color": "#F0F0FF",
        "school": "Hallowed Path of Heaven's Light",
        "art": "Triune Lifegiver Scripture of the Holy Bond",
    },
    "Harrow Prime": {
        "color": "#7E1F2E",
        "school": "Hallowed Path of Heaven's Light",
        "art": "Inquisitor's Penance Path of the Crimson Censer",
    },
    "Baruuk Prime": {
        "color": "#1F4FA8",
        "school": "Hallowed Path of Heaven's Light",
        "art": "Restraint Mandala Sutra of the Pacifist Fist",
    },

    "Nezha Prime": {
        "color": "#E63946",
        "school": "Heavenly Mandate Pantheon",
        "art": "Lotus Prince Dao of Wind-Fire Wheels",
    },
    "Wukong Prime": {
        "color": "#FFB300",
        "school": "Heavenly Mandate Pantheon",
        "art": "Monkey Sage Dao of the Five Immortalities",
    },
    "Excalibur Umbra": {
        "color": "#2F2A23",
        "school": "Heavenly Mandate Pantheon",
        "art": "Umbral Ronin Dao of the Filial Sword",
    },

    "Volt Prime": {
        "color": "#9CA3AF",
        "school": "Storm Heaven Convocation",
        "art": "Heavenly Thunder Path of the Voltaic Sovereign",
    },
    "Gyre": {
        "color": "#9D4EDD",
        "school": "Storm Heaven Convocation",
        "art": "Tesla Pirouette Dao of the Coil-Born Empress",
    },
    "Gauss Prime": {
        "color": "#E63946",
        "school": "Storm Heaven Convocation",
        "art": "Kinetic Velocity Scripture of the Redline Saint",
    },
    "Zephyr Prime": {
        "color": "#D4AF37",
        "school": "Storm Heaven Convocation",
        "art": "Tengu Dao of the Falling Plume",
    },
    "Styanax": {
        "color": "#B87333",
        "school": "Storm Heaven Convocation",
        "art": "Hoplite Aegis Dao of the Worthy Spear",
    },
    "Hildryn Prime": {
        "color": "#4A90E2",
        "school": "Storm Heaven Convocation",
        "art": "Shieldmaiden Aegis Dao of the Balefire Storm",
    },
    "Mag Prime": {
        "color": "#A8DADC",
        "school": "Storm Heaven Convocation",
        "art": "Polar Star Sutra of the Magnetar's Embrace",
    },

    "Ash Prime": {
        "color": "#3D3D3D",
        "school": "Moonless Veil Order",
        "art": "Smoke Shadow Dao of the Patron Assassin",
    },
    "Loki Prime": {
        "color": "#2A4A6B",
        "school": "Moonless Veil Order",
        "art": "Trickster Mirage Dao of the Hundred Decoys",
    },
    "Ivara Prime": {
        "color": "#7CFFB2",
        "school": "Moonless Veil Order",
        "art": "Midnight Quiver Dao of the Silent Artemis",
    },
    "Mirage Prime": {
        "color": "#FFD23F",
        "school": "Moonless Veil Order",
        "art": "Harlequin Eclipse Dao of Mirrored Stagecraft",
    },
    "Voruna": {
        "color": "#7B1F3D",
        "school": "Moonless Veil Order",
        "art": "Blood-Moon Wolfpack Dao of the Severed Heads",
    },
    "Banshee Prime": {
        "color": "#B8E1F0",
        "school": "Moonless Veil Order",
        "art": "Wailing Sound Dao of the Sídhe Keening",
    },

    "Nekros Prime": {
        "color": "#5E2D8C",
        "school": "Necropolis Dominion",
        "art": "Black Shroud Dao of the Soul Reaper",
    },
    "Sevagoth": {
        "color": "#0F1F2E",
        "school": "Necropolis Dominion",
        "art": "Tempestarii Reaper Dao of the Twin Forms",
    },
    "Dagath": {
        "color": "#8B0000",
        "school": "Necropolis Dominion",
        "art": "Faceless Cavalry Dao of the Mirror That Accuses",
    },

    "Saryn Prime": {
        "color": "#7FB800",
        "school": "Plague Garden Sect",
        "art": "Tang Sect Spore Dao of the Serpent Contagion",
    },
    "Nidus Prime": {
        "color": "#4A0E0E",
        "school": "Plague Garden Sect",
        "art": "Infested Cordyceps Dao of the Mutating Host",
    },
    "Oraxia": {
        "color": "#1A0F1F",
        "school": "Plague Garden Sect",
        "art": "Jorōgumo Silk Dao of the Venomed Gown",
    },
    "Nokko": {
        "color": "#FF6B6B",
        "school": "Plague Garden Sect",
        "art": "Mycelium Sprout Dao of the False Morel",
    },
    "Qorvex": {
        "color": "#D4D700",
        "school": "Plague Garden Sect",
        "art": "Atomic Brutalist Dao of the Crucible Core",
    },
    "Lavos Prime": {
        "color": "#D4D700",
        "school": "Plague Garden Sect",
        "art": "Alchemical Transmutation Dao of the Catalytic Crucible",
    },

    "Hydroid Prime": {
        "color": "#1B6E8C",
        "school": "Tidal Abyss Confraternity",
        "art": "Kraken Pirate Dao of the Davy Tempest",
    },
    "Frost Prime": {
        "color": "#A8E6FF",
        "school": "Tidal Abyss Confraternity",
        "art": "Eternal Winter Dao of the Snow Globe Sovereign",
    },
    "Gara Prime": {
        "color": "#F5F5F0",
        "school": "Tidal Abyss Confraternity",
        "art": "Shattered Glass Dao of the Vitrified Martyr",
    },
    "Citrine": {
        "color": "#FFB000",
        "school": "Tidal Abyss Confraternity",
        "art": "Geode Aurora Dao of the Prismatic Vow",
    },
    "Khora Prime": {
        "color": "#C0C0C0",
        "school": "Tidal Abyss Confraternity",
        "art": "Silver Chain Huntress Dao of the Mistress and Beast",
    },

    "Nova Prime": {
        "color": "#FF1493",
        "school": "Cosmic Antimatter Council",
        "art": "Antimatter Dao of the Molecular Empress",
    },
    "Caliban": {
        "color": "#E8E4D0",
        "school": "Cosmic Antimatter Council",
        "art": "Rift Hybrid Dao of the Twin-Born Heir",
    },
    "Xaku Prime": {
        "color": "#9ACD32",
        "school": "Cosmic Antimatter Council",
        "art": "Void-Shattered Dao of the Three Voices",
    },
    "Nyx Prime": {
        "color": "#6A0DAD",
        "school": "Cosmic Antimatter Council",
        "art": "Mind Veil Dao of the Primordial Night",
    },

    "Inaros Prime": {
        "color": "#D4A017",
        "school": "Desert Crown Reliquary",
        "art": "Pharaoh Sand Dao of the Deshret Crown",
    },

    "Rhino Prime": {
        "color": "#B89F50",
        "school": "Ironclad Mountain Hall",
        "art": "Iron Hide Dao of the Charging Titan",
    },
    "Atlas Prime": {
        "color": "#6B4423",
        "school": "Ironclad Mountain Hall",
        "art": "Earthbound Titan Dao of the Petrified Gaze",
    },
    "Grendel": {
        "color": "#5A3A1B",
        "school": "Ironclad Mountain Hall",
        "art": "Devouring Oni Dao of the Insatiable Belly",
    },
    "Chroma Prime": {
        "color": "#8B0000",
        "school": "Ironclad Mountain Hall",
        "art": "Chromatic Dragon Dao of the Vex Pelt",
    },

    "Octavia Prime": {
        "color": "#E5B8E5",
        "school": "Phantom Theater Conservatory",
        "art": "Mandachord Resonance Dao of the Pentatonic Bard",
    },
    "Dante": {
        "color": "#003366",
        "school": "Phantom Theater Conservatory",
        "art": "Tomeweaver Dao of the Inferno-Paradiso Verses",
    },

    "Protea Prime": {
        "color": "#2EBFA5",
        "school": "Chronos Engineering Bureau",
        "art": "Protean Chrono Dao of the Anchored Rewind",
    },
    "Vauban Prime": {
        "color": "#1F3A93",
        "school": "Chronos Engineering Bureau",
        "art": "Bastille Siegecraft Dao of the Star-Fort Marshal",
    },
    "Mesa Prime": {
        "color": "#FFC107",
        "school": "Chronos Engineering Bureau",
        "art": "Peacemaker Gunslinger Dao of the High Noon Topaz",
    },
    "Cyte-09": {
        "color": "#4A6FA5",
        "school": "Chronos Engineering Bureau",
        "art": "Frumentarius Sniper Dao of the Practiced Eye",
    },
    "Koumei": {
        "color": "#D62828",
        "school": "Chronos Engineering Bureau",
        "art": "Five-Fates Dice Dao of the Plum-Blossom Oracle",
    },
    "Uriel": {
        "color": "#DC143C",
        "school": "Chronos Engineering Bureau",
        "art": "Brimstone Lucifer Dao of the Triadic Legion",
    },
}


def seed():
    result = supabase.schema("wf_user").table("my_frames").select(
        "my_frame_id, warframe_id"
    ).execute()

    wf_result = supabase.schema("wf_base").table("warframes").select(
        "warframe_id, name"
    ).execute()

    wf_map = {w["warframe_id"]: w["name"] for w in wf_result.data}

    updated = 0
    skipped = 0

    for frame in result.data:
        frame_name = wf_map.get(frame["warframe_id"])
        data = CULTIVATION_DATA.get(frame_name)

        if not data:
            print(f"No cultivation data defined for: {frame_name}")
            skipped += 1
            continue

        payload = {
            "cultivation_color": data["color"],
            "cultivation_school": data["school"],
            "cultivation_art": data["art"],
        }

        supabase.schema("wf_user").table("my_frames").update(payload).eq(
            "my_frame_id", frame["my_frame_id"]
        ).execute()

        print(
            f"Seeded: {frame_name} → {data['school']} | {data['art']} | {data['color']}"
        )
        updated += 1

    print(f"\nDone. {updated} seeded, {skipped} skipped.")


if __name__ == "__main__":
    seed()