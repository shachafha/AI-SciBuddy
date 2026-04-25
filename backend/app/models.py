from enum import StrEnum


class NoveltySignal(StrEnum):
    NOT_FOUND = "not_found"
    SIMILAR_WORK_EXISTS = "similar_work_exists"
    EXACT_MATCH_FOUND = "exact_match_found"
