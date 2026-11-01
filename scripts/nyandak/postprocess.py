#!/usr/bin/env python3
"""Post-process docx: patch footer PAGE field format switches (ROMAN/arabic)
dan hapus <w:pgNumType/> kosong dari sectPr cover. Wajib per toc.md."""
import re, sys, zipfile, shutil, os

def main(path):
    tmp = path + ".tmp"
    shutil.copy(path, tmp)
    zin = zipfile.ZipFile(tmp, "r")
    names = zin.namelist()
    files = {n: zin.read(n) for n in names}
    zin.close()

    doc = files["word/document.xml"].decode("utf-8")
    # 1) hapus pgNumType kosong (emisi docx-js untuk cover)
    doc = doc.replace("<w:pgNumType/>", "")

    # 1b) dedup TOC: buang entri pertama yang menempel di paragraf pembuka field
    # (docx-js menaruh begin+instr+separate di satu <w:p>, lalu script placeholder
    #  memasukkan entri yang sama lagi di paragraf tersendiri -> duplikat)
    n_dedup = 0
    i0 = doc.find(">TOC \\h")
    sep_marker = '<w:fldChar w:fldCharType="separate"/>'
    if i0 != -1:
        i_sep = doc.find(sep_marker, i0)
        if i_sep != -1:
            i_run_close = doc.find("</w:r>", i_sep)
            i_p_end = doc.find("</w:p>", i_run_close)
            chunk = doc[i_run_close:i_p_end]
            if i_run_close != -1 and i_p_end != -1 and "<w:hyperlink" in chunk:
                keep = i_run_close + len("</w:r>")
                doc = doc[:keep] + doc[i_p_end:]
                n_dedup = 1
    print(f"TOC dedup: {n_dedup} paragraf dibersihkan")

    # 2) petakan sectPr berurutan -> footerReference r:id
    rels = files["word/_rels/document.xml.rels"].decode("utf-8")
    rid_to_target = dict(re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels))

    sectprs = re.findall(r"<w:sectPr[ >].*?</w:sectPr>", doc, flags=re.S)
    fmts = []  # format per sectPr sesuai urutan
    for sp in sectprs:
        m = re.search(r'<w:pgNumType[^>]*w:fmt="([^"]+)"', sp)
        fmts.append(m.group(1) if m else None)
        fr = re.search(r'<w:footerReference w:type="default" r:id="([^"]+)"', sp)
        if fr:
            target = rid_to_target.get(fr.group(1), "")
            fname = "word/" + target.lstrip("/")
            if fname in files:
                fmt = m.group(1) if m else "decimal"
                switch = "ROMAN" if "oman" in fmt.lower() else "arabic"
                fx = files[fname].decode("utf-8")
                fx = re.sub(r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
                            r"\g<1> PAGE \\* " + switch + r" \\* MERGEFORMAT \g<2>", fx)
                files[fname] = fx.encode("utf-8")

    files["word/document.xml"] = doc.encode("utf-8")
    zout = zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED)
    for n in names:
        zout.writestr(n, files[n])
    zout.close()
    os.remove(tmp)
    print(f"postprocess OK: {len(sectprs)} sectPr, fmts={fmts}")

if __name__ == "__main__":
    main(sys.argv[1])
