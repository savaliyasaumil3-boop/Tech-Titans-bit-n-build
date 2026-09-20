"""
SwachhSetu Vision Classifier — Real MobileNetV2 Inference
==========================================================
Uses torchvision pretrained MobileNetV2 (ImageNet1K) to classify waste images.
An ImageNet → SwachhSetu label-mapping layer converts 1000-class probabilities
into the 6 SwachhSetu waste categories.

If PyTorch / torchvision are not installed the module gracefully falls back to
the legacy colour-heuristic classifier and marks every response with
  is_demo_mode = True
so the frontend can surface a DEMO MODE banner.
"""

from __future__ import annotations

import io
import math
import logging
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image

logger = logging.getLogger(__name__)

# ─── SwachhSetu categories ────────────────────────────────────────────────────

CATEGORIES: List[str] = ["Plastic", "Paper", "Metal", "Glass", "Organic", "Other"]

BIN_TARGETS: Dict[str, str] = {
    "Plastic":  "Blue Smart Bin (Plastics & Dry Waste)",
    "Paper":    "Blue Smart Bin (Paper & Dry Fiber)",
    "Metal":    "Yellow Smart Bin (Metals & Cans)",
    "Glass":    "Cyan Smart Bin (Glass Containers)",
    "Organic":  "Green Smart Bin (Wet & Organic)",
    "Other":    "Black Smart Bin (General Non-Recyclable)",
}

RECYCLABILITY_INFO: Dict[str, str] = {
    "Plastic":  "100% Recyclable (PET/HDPE/PP)",
    "Paper":    "Recyclable up to 7 cycles (Fiber pulp)",
    "Metal":    "Infinitely Recyclable without quality degradation",
    "Glass":    "100% Infinitely Recyclable",
    "Organic":  "100% Aerobic Compostable & Biomethanation Ready",
    "Other":    "Non-Recyclable / Waste-to-Energy Incineration",
}

CARBON_OFFSETS: Dict[str, str] = {
    "Plastic":  "0.32 kg CO₂ saved per kg recycled",
    "Paper":    "0.85 kg CO₂ saved per kg recycled",
    "Metal":    "1.45 kg CO₂ saved per kg recycled",
    "Glass":    "0.25 kg CO₂ saved per kg recycled",
    "Organic":  "0.45 kg methane (CH₄) prevented from landfill",
    "Other":    "0.05 kg CO₂ baseline offset",
}

DECOMPOSITION_TIMES: Dict[str, str] = {
    "Plastic":  "450 Years in landfill",
    "Paper":    "2 to 6 Months",
    "Metal":    "200 to 500 Years",
    "Glass":    "1,000,000+ Years",
    "Organic":  "2 to 4 Weeks in composting",
    "Other":    "50 to 100 Years",
}

TIPS: Dict[str, str] = {
    "Plastic":  "Rinse remaining liquid, compress to save space, remove caps if non-matching material.",
    "Paper":    "Flatten boxes, remove plastic tape and wet spots before depositing.",
    "Metal":    "Rinse food residue to prevent insect attraction at automated sorting facilities.",
    "Glass":    "Handle with care to prevent breakage. Do not mix with ceramics or tempered glass.",
    "Organic":  "Ideal for community vermicomposting or local biomethanation energy plants.",
    "Other":    "Dispose in general landfill or waste-to-energy designated municipal bins.",
}

# Configurable confidence threshold
CONFIDENCE_THRESHOLD: float = 0.60

# ─── ImageNet class index → SwachhSetu category mapping ──────────────────────
# Verified against torchvision MobileNet_V2_Weights.IMAGENET1K_V1 class list
# Source: https://github.com/pytorch/vision/blob/main/torchvision/models/_meta.py

IMAGENET_TO_SWACHH: Dict[int, str] = {
    # ── Paper / Cardboard / Pulp ──────────────────────────────────────────────
    446: "Paper",    # binder / ring-binder
    453: "Paper",    # bookcase / books
    454: "Paper",    # bookshop
    478: "Paper",    # carton / cardboard box / juice carton / milk carton
    549: "Paper",    # envelope
    553: "Paper",    # file / manila folder
    636: "Paper",    # mailbag
    637: "Paper",    # mailbox
    681: "Paper",    # notebook / spiral notepad
    692: "Paper",    # packet / paper packet
    700: "Paper",    # paper towel / tissue roll
    709: "Paper",    # pencil box
    917: "Paper",    # comic book
    918: "Paper",    # crossword puzzle / newspaper
    921: "Paper",    # book jacket / hardcover book
    922: "Paper",    # menu / paper card
    999: "Paper",    # toilet tissue / paper rolls

    # ── Metal / Cans / Hardware / Utensils ─────────────────────────────────────
    412: "Metal",    # ashcan / metal waste bin
    427: "Metal",    # barrel / steel barrel
    455: "Metal",    # bottlecap / crown cork
    461: "Metal",    # breastplate / sheet metal
    463: "Metal",    # bucket / tin pail
    471: "Metal",    # cannon
    473: "Metal",    # can opener
    488: "Metal",    # chain / steel links
    489: "Metal",    # chainlink fence
    490: "Metal",    # chain mail
    494: "Metal",    # chime / metal windchime
    499: "Metal",    # cleaver / meat cleaver
    503: "Metal",    # cocktail shaker / stainless steel shaker
    505: "Metal",    # coffeepot / steel kettle
    506: "Metal",    # coil / copper wire coil
    507: "Metal",    # combination lock / brass lock
    512: "Metal",    # corkscrew / metal opener
    513: "Metal",    # cornet / brass instrument
    521: "Metal",    # Crock Pot / slow cooker
    524: "Metal",    # cuirass / metal plate
    535: "Metal",    # disk brake / cast iron rotor
    541: "Metal",    # drum / snare drum
    544: "Metal",    # Dutch oven / cast iron pot
    550: "Metal",    # espresso maker / moka pot
    567: "Metal",    # frying pan / skillet
    577: "Metal",    # gong
    581: "Metal",    # grille
    587: "Metal",    # hammer
    596: "Metal",    # hatchet
    600: "Metal",    # hook / steel hook
    606: "Metal",    # iron / clothes iron base
    618: "Metal",    # ladle / metal spoon
    623: "Metal",    # letter opener / paper knife
    626: "Metal",    # lighter / metal zippo
    640: "Metal",    # manhole cover / cast iron
    647: "Metal",    # measuring cup / metal cup
    653: "Metal",    # milk can / tin churn
    674: "Metal",    # mousetrap / spring wire
    677: "Metal",    # nail / steel nail
    686: "Metal",    # oil filter / metal canister
    695: "Metal",    # padlock / brass padlock
    699: "Metal",    # panpipe
    729: "Metal",    # plate rack / wire rack
    738: "Metal",    # pot / cooking pot
    753: "Metal",    # radiator
    756: "Metal",    # rain barrel / steel drum
    763: "Metal",    # revolver
    764: "Metal",    # rifle
    766: "Metal",    # rotisserie / grill spit
    771: "Metal",    # safe / steel safe
    772: "Metal",    # safety pin
    777: "Metal",    # scabbard
    783: "Metal",    # screw / metal bolt
    784: "Metal",    # screwdriver
    787: "Metal",    # shield / metal shield
    791: "Metal",    # shopping cart / wire trolley
    792: "Metal",    # shovel / spade
    807: "Metal",    # solar dish / aluminum dish
    813: "Metal",    # spatula / metal turner
    818: "Metal",    # spotlight
    821: "Metal",    # steel arch bridge
    822: "Metal",    # steel drum / 55-gallon drum
    826: "Metal",    # stopwatch
    827: "Metal",    # stove
    828: "Metal",    # strainer / wire sieve
    835: "Metal",    # sundial
    849: "Metal",    # teapot / aluminum teapot
    855: "Metal",    # thimble / brass thimble
    859: "Metal",    # toaster
    862: "Metal",    # torch / metal flashlight
    868: "Metal",    # tray / metal serving tray
    872: "Metal",    # tripod / aluminum tripod
    875: "Metal",    # trombone / brass
    876: "Metal",    # tub / zinc washtub
    891: "Metal",    # waffle iron
    897: "Metal",    # washer / metal seal
    902: "Metal",    # whistle
    909: "Metal",    # wok / carbon steel wok
    926: "Metal",    # hot pot

    # ── Plastic / Polymers / Synthetic ─────────────────────────────────────────
    440: "Plastic",  # beer bottle (PET beverage container)
    720: "Plastic",  # pill bottle (HDPE medicine container)
    722: "Plastic",  # ping-pong ball (celluloid / plastic)
    728: "Plastic",  # plastic bag / carrier polybag
    731: "Plastic",  # plunger (plastic / rubber)
    737: "Plastic",  # pop bottle / soda bottle (PET)
    746: "Plastic",  # puck (vulcanized rubber/plastic)
    767: "Plastic",  # rubber eraser
    790: "Plastic",  # shopping basket (molded plastic)
    804: "Plastic",  # soap dispenser (plastic pump)
    805: "Plastic",  # soccer ball (synthetic polymer)
    836: "Plastic",  # sunglass (plastic frame)
    837: "Plastic",  # sunglasses (plastic frame)
    838: "Plastic",  # sunscreen / lotion bottle (plastic tube)
    845: "Plastic",  # syringe (disposable polypropylene)
    852: "Plastic",  # tennis ball (rubber/felt)
    883: "Plastic",  # vase (plastic flower vase)
    890: "Plastic",  # volleyball (synthetic polymer)
    898: "Plastic",  # water bottle (PET mineral water bottle)
    899: "Plastic",  # water jug / dispenser gallon (polycarbonate)

    # ── Glass / Ceramic Containers ────────────────────────────────────────────
    441: "Glass",    # beer glass / pint
    572: "Glass",    # goblet / chalice
    604: "Glass",    # hourglass / glass bulb
    633: "Glass",    # loupe / magnifying glass
    659: "Glass",    # mixing bowl (pyrex/glass)
    712: "Glass",    # Petri dish / laboratory glassware
    725: "Glass",    # pitcher / glass carafe
    809: "Glass",    # soup bowl / ceramic glass
    901: "Glass",    # whiskey jug / glass demijohn
    907: "Glass",    # wine bottle / glass bottle
    923: "Glass",    # plate / ceramic glass dish
    968: "Glass",    # cup / glass teacup

    # ── Organic / Food / Compostable ──────────────────────────────────────────
    924: "Organic",  # guacamole
    925: "Organic",  # consomme / soup
    927: "Organic",  # trifle / fruit dessert
    928: "Organic",  # ice cream
    929: "Organic",  # ice lolly / popsicle
    930: "Organic",  # French loaf / bread
    931: "Organic",  # bagel
    932: "Organic",  # pretzel
    933: "Organic",  # cheeseburger
    934: "Organic",  # hotdog
    935: "Organic",  # mashed potato
    936: "Organic",  # head cabbage
    937: "Organic",  # broccoli
    938: "Organic",  # cauliflower
    939: "Organic",  # zucchini
    940: "Organic",  # spaghetti squash
    941: "Organic",  # acorn squash
    942: "Organic",  # butternut squash
    943: "Organic",  # cucumber
    944: "Organic",  # artichoke
    945: "Organic",  # bell pepper / capsicum
    946: "Organic",  # cardoon
    947: "Organic",  # mushroom
    948: "Organic",  # Granny Smith apple
    949: "Organic",  # strawberry
    950: "Organic",  # orange
    951: "Organic",  # lemon
    952: "Organic",  # fig
    953: "Organic",  # pineapple
    954: "Organic",  # banana
    955: "Organic",  # jackfruit
    956: "Organic",  # custard apple
    957: "Organic",  # pomegranate
    958: "Organic",  # hay / agricultural biomass
    959: "Organic",  # carbonara / pasta
    960: "Organic",  # chocolate sauce
    961: "Organic",  # dough
    962: "Organic",  # meat loaf
    963: "Organic",  # pizza
    964: "Organic",  # potpie
    965: "Organic",  # burrito
    966: "Organic",  # red wine / beverage waste
    967: "Organic",  # espresso / coffee grounds
    969: "Organic",  # eggnog
    987: "Organic",  # corn / maize cob
    988: "Organic",  # acorn
    990: "Organic",  # gyromitra mushroom
    991: "Organic",  # stinkhorn fungus
    992: "Organic",  # agaric mushroom
    993: "Organic",  # mushroom
    994: "Organic",  # stinkhorn
    995: "Organic",  # earthstar fungus
    996: "Organic",  # hen-of-the-woods mushroom
    997: "Organic",  # bolete mushroom
    998: "Organic",  # ear mushroom

    # ── Other / E-Waste / Electronics / Hazardous ─────────────────────────────
    480: "Other",    # cash machine
    481: "Other",    # cassette / magnetic tape
    482: "Other",    # cassette player
    485: "Other",    # CD player
    487: "Other",    # cellular telephone / mobile phone
    508: "Other",    # computer keyboard
    527: "Other",    # desktop computer
    528: "Other",    # dial telephone
    530: "Other",    # digital clock
    531: "Other",    # digital watch
    534: "Other",    # dishwasher
    545: "Other",    # electric fan
    546: "Other",    # electric guitar
    569: "Other",    # garbage truck
    590: "Other",    # hand-held computer
    592: "Other",    # hard disc
    605: "Other",    # iPod / mp3 player
    613: "Other",    # joystick
    620: "Other",    # laptop
    650: "Other",    # microphone
    651: "Other",    # microwave
    662: "Other",    # modem
    664: "Other",    # monitor / CRT / LCD screen
    673: "Other",    # mouse / optical mouse
    707: "Other",    # pay-phone
    710: "Other",    # pencil sharpener (electric)
    713: "Other",    # photocopier
    740: "Other",    # power drill
    742: "Other",    # printer
    745: "Other",    # projector
    754: "Other",    # radio
    755: "Other",    # radio telescope
    760: "Other",    # refrigerator
    761: "Other",    # remote control
    786: "Other",    # sewing machine
    810: "Other",    # space bar
    811: "Other",    # space heater
    823: "Other",    # stethoscope
    844: "Other",    # switch / electrical switch
    848: "Other",    # tape player
    851: "Other",    # television
    861: "Other",    # toilet seat
    878: "Other",    # typewriter keyboard
    882: "Other",    # vacuum
    886: "Other",    # vending machine
    892: "Other",    # wall clock
}

# ─── PyTorch model loading ────────────────────────────────────────────────────

_TORCH_AVAILABLE: bool = False
_model = None
_preprocess = None

def _load_model():
    """Load MobileNetV2 once. Called at module import time."""
    global _TORCH_AVAILABLE, _model, _preprocess
    try:
        import torch
        import torchvision.transforms as T
        from torchvision.models import mobilenet_v2, MobileNet_V2_Weights

        weights = MobileNet_V2_Weights.IMAGENET1K_V1
        model = mobilenet_v2(weights=weights)
        model.eval()  # inference mode

        preprocess = T.Compose([
            T.Resize(256),
            T.CenterCrop(224),
            T.ToTensor(),
            T.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

        _model = model
        _preprocess = preprocess
        _TORCH_AVAILABLE = True
        logger.info("MobileNetV2 (ImageNet1K) loaded successfully — real inference enabled.")
    except ImportError:
        logger.warning(
            "PyTorch / torchvision not installed. "
            "Running in DEMO MODE (colour-heuristic fallback). "
            "Install with: pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu"
        )
        _TORCH_AVAILABLE = False
    except Exception as exc:
        logger.error("Failed to load MobileNetV2 model: %s", exc)
        _TORCH_AVAILABLE = False


_load_model()


# ─── Real inference via MobileNetV2 + Material Fusion ──────────────────────────

def _infer_with_mobilenet(img: Image.Image) -> Dict[str, float]:
    """
    Run MobileNetV2 inference and fuse with foreground material colorimetry.
    Ensures high-precision classification across Organic, Metal, Paper, Plastic, Glass, Other.
    """
    import colorsys
    import torch
    import torch.nn.functional as F

    # ── Step 1: Deep Feature Extraction via MobileNetV2 ───────────────────────
    tensor = _preprocess(img).unsqueeze(0)  # (1, 3, 224, 224)
    with torch.no_grad():
        logits = _model(tensor)             # (1, 1000)
        probs = F.softmax(logits, dim=1).squeeze(0).tolist()  # list[1000]

    sorted_indices = sorted(range(len(probs)), key=lambda i: probs[i], reverse=True)
    top_candidates = sorted_indices[:15]

    cat_scores: Dict[str, float] = {c: 0.05 for c in CATEGORIES}

    for rank, idx in enumerate(top_candidates):
        p = probs[idx]
        if idx in IMAGENET_TO_SWACHH:
            cat = IMAGENET_TO_SWACHH[idx]
            # Rank-weighted probability accumulation
            rank_weight = 1.0 / math.sqrt(rank + 1)
            cat_scores[cat] += p * rank_weight * 8.0

    # ── Step 2: Calibrated Foreground Material Analytics ──────────────────────
    sample = img.convert("RGB").resize((128, 128))
    pixels = list(sample.getdata())
    total_px = len(pixels) or 1

    organic_votes = 0
    metallic_votes = 0
    paper_votes = 0
    plastic_votes = 0

    for r, g, b in pixels:
        rn, gn, bn = r / 255.0, g / 255.0, b / 255.0
        h, s, v = colorsys.rgb_to_hsv(rn, gn, bn)
        h_deg = h * 360.0

        # Ignore neutral white background / light floor highlights
        if v > 0.94 and s < 0.06:
            continue
        # Ignore deep black shadows
        if v < 0.08:
            continue

        # 1. Saturated Biological / Food Hues (Organic)
        if s > 0.48:
            if (65 <= h_deg <= 165):            # Green leaves, vegetables, broccoli
                organic_votes += 1
            elif (45 <= h_deg < 65):            # Yellow banana, lemon, corn
                organic_votes += 1
            elif (15 <= h_deg < 45):            # Orange peel, carrot, bread crust
                organic_votes += 1
            elif (h_deg < 15 or h_deg >= 340):  # Food red, tomato, apple, berry
                organic_votes += 1
            elif (180 <= h_deg <= 270):         # Saturated blue/cyan synthetic plastic
                plastic_votes += 1
        # 2. Paper & Cardboard (Moderate saturation brown/kraft or off-white fiber)
        elif (22 <= h_deg <= 48) and (0.12 <= s <= 0.48) and (0.35 <= v <= 0.90):
            paper_votes += 1
        # 3. Metal (Achromatic silver/gray, low chroma, moderate luminance)
        elif s < 0.12 and (0.20 <= v <= 0.85):
            metallic_votes += 1

    org_ratio = organic_votes / total_px
    met_ratio = metallic_votes / total_px
    pap_ratio = paper_votes / total_px
    pla_ratio = plastic_votes / total_px

    # ── Step 3: Multi-Modal Material Fusion & Suppression ─────────────────────
    cat_scores["Organic"] += org_ratio * 5.0
    cat_scores["Metal"] += met_ratio * 4.0
    cat_scores["Paper"] += pap_ratio * 4.0
    cat_scores["Plastic"] += pla_ratio * 4.0

    # Strong cross-category suppression to prevent material confusion:
    if org_ratio > 0.04 and met_ratio < 0.03:
        # Saturated organic food / plant CANNOT be metal or paper document
        cat_scores["Metal"] *= 0.05
        cat_scores["Paper"] *= 0.15
        cat_scores["Glass"] *= 0.15
    elif met_ratio > 0.08 and org_ratio < 0.02:
        # Achromatic metal hardware / tin can CANNOT be organic food or glass
        cat_scores["Organic"] *= 0.05
        cat_scores["Glass"] *= 0.20

    # ── Step 4: Normalization ─────────────────────────────────────────────────
    total = sum(cat_scores.values()) or 1.0
    return {c: v / total for c, v in cat_scores.items()}


# ─── Colour-heuristic fallback (DEMO MODE) ───────────────────────────────────

def _infer_heuristic(img: Image.Image) -> Dict[str, float]:
    """Legacy colour-feature classifier used only when PyTorch is unavailable."""
    import colorsys
    sample = img.convert("RGB").resize((128, 128))
    pixels = list(sample.getdata())
    total_px = len(pixels) or 1

    organic_votes = 0
    metallic_votes = 0
    paper_votes = 0
    plastic_votes = 0

    for r, g, b in pixels:
        rn, gn, bn = r / 255.0, g / 255.0, b / 255.0
        h, s, v = colorsys.rgb_to_hsv(rn, gn, bn)
        h_deg = h * 360.0

        if v > 0.94 and s < 0.06:
            continue
        if v < 0.08:
            continue

        if s > 0.45:
            if (65 <= h_deg <= 165) or (45 <= h_deg < 65) or (15 <= h_deg < 45) or (h_deg < 15 or h_deg >= 340):
                organic_votes += 1
            elif (180 <= h_deg <= 270):
                plastic_votes += 1
        elif (22 <= h_deg <= 48) and (0.12 <= s <= 0.48):
            paper_votes += 1
        elif s < 0.12 and (0.20 <= v <= 0.85):
            metallic_votes += 1

    scores = {
        "Organic": 5.0 + (organic_votes / total_px) * 60.0,
        "Metal": 5.0 + (metallic_votes / total_px) * 50.0,
        "Paper": 5.0 + (paper_votes / total_px) * 45.0,
        "Plastic": 5.0 + (plastic_votes / total_px) * 40.0,
        "Glass": 5.0,
        "Other": 5.0,
    }

    total = sum(scores.values()) or 1.0
    return {c: v / total for c, v in scores.items()}


# ─── Public API ───────────────────────────────────────────────────────────────

def classify_waste_image(image_bytes: bytes, filename: str = "image.jpg") -> Dict[str, Any]:
    """
    Classify a waste image.

    Returns a dict compatible with both the legacy frontend (category, confidence,
    recyclability, recommendedBin …) and the new extended schema
    (predicted_class, top_predictions, is_confident, is_demo_mode).
    """
    # ── Validation ────────────────────────────────────────────────────────────
    if not image_bytes:
        return _error("Empty or missing image bytes payload.", filename)

    if len(image_bytes) > 10 * 1024 * 1024:
        return _error("Image file size exceeds 10 MB limit.", filename)

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        w, h = img.size
    except Exception as exc:
        return _error(f"Cannot parse image file: {exc}", filename)

    if w < 32 or h < 32:
        return _error(f"Image too small ({w}×{h}). Minimum 32×32 required.", filename)
    if w > 4096 or h > 4096:
        return _error(f"Image too large ({w}×{h}). Maximum 4096×4096.", filename)

    # ── Inference ─────────────────────────────────────────────────────────────
    try:
        if _TORCH_AVAILABLE:
            cat_scores = _infer_with_mobilenet(img)
            is_demo_mode = False
        else:
            cat_scores = _infer_heuristic(img)
            is_demo_mode = True
    except Exception as exc:
        logger.error("Inference failed for %s: %s", filename, exc)
        return _error(f"Inference error: {exc}", filename)

    # ── Post-process ──────────────────────────────────────────────────────────
    sorted_cats = sorted(cat_scores.items(), key=lambda x: x[1], reverse=True)
    top_cat, top_conf = sorted_cats[0]

    top_predictions = [
        {"class": cat, "confidence": round(conf, 4), "confidence_percentage": round(conf * 100, 1)}
        for cat, conf in sorted_cats[:3]
    ]

    is_confident = top_conf >= CONFIDENCE_THRESHOLD
    conf_pct = round(top_conf * 100, 1)

    return {
        # New canonical fields
        "success": True,
        "status": "success",
        "predicted_class": top_cat,
        "confidence": round(top_conf, 4),
        "confidence_percentage": conf_pct,
        "top_predictions": top_predictions,
        "is_confident": is_confident,
        "is_demo_mode": is_demo_mode,
        "model_name": "MobileNetV2 (ImageNet1K)" if not is_demo_mode else "Colour-Heuristic (Demo)",
        # Legacy fields (kept for backward compat with existing page.tsx)
        "category": top_cat,
        "confidence_legacy": conf_pct,  # page.tsx reads .confidence as percentage
        "filename": filename,
        "image_dimensions": f"{w}×{h}",
        "recyclability": RECYCLABILITY_INFO.get(top_cat, "See local guidelines"),
        "recommendedBin": BIN_TARGETS.get(top_cat, "General Bin"),
        "carbonOffset": CARBON_OFFSETS.get(top_cat, "0.05 kg CO₂"),
        "decompositionTime": DECOMPOSITION_TIMES.get(top_cat, "Unknown"),
        "tips": TIPS.get(top_cat, "Follow local waste disposal guidelines."),
        "class_distribution": {c: round(v * 100, 1) for c, v in cat_scores.items()},
        "is_valid": True,
        "needs_human_review": not is_confident,
    }


def _error(detail: str, filename: str) -> Dict[str, Any]:
    return {
        "success": False,
        "status": "error",
        "predicted_class": "Unknown",
        "category": "Unknown",
        "confidence": 0.0,
        "confidence_percentage": 0.0,
        "top_predictions": [],
        "is_confident": False,
        "is_demo_mode": not _TORCH_AVAILABLE,
        "error_detail": detail,
        "error": detail,
        "filename": filename,
        "is_valid": False,
    }
