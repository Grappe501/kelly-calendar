"use client";

type Props = {
  locationDisclosure: string;
  onLocationDisclosure: (value: string) => void;
};

export function VisibilityForm({ locationDisclosure, onLocationDisclosure }: Props) {
  return (
    <fieldset>
      <legend>Location disclosure</legend>
      {["EXACT", "VENUE", "CITY", "COUNTY", "REGION", "HIDDEN"].map((level) => (
        <label key={level} className="check-inline">
          <input
            type="radio"
            name="visibility-loc"
            checked={locationDisclosure === level}
            onChange={() => onLocationDisclosure(level)}
          />{" "}
          {level}
        </label>
      ))}
      <p className="muted">
        Defaults: show calendar name, safe title, general location, start/end; hide protected
        details.
      </p>
    </fieldset>
  );
}
